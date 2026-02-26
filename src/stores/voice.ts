import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VoicePeer, VoiceSignal, VoiceInvite } from '@/types'
import { webrtcService } from '@/services/webrtc'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { soundManager } from '@/composables/useSounds'
import { useAuthStore } from '@/stores/auth'

export const useVoiceStore = defineStore('voice', () => {
  const authStore = useAuthStore()
  const currentChannelId = ref<string | null>(null)
  const currentServerId = ref<string | null>(null)
  const peers = ref<VoicePeer[]>([])
  const isMuted = ref(false)
  const isDeafened = ref(false)
  const isConnecting = ref(false)
  const isScreenSharing = ref(false)
  const connectedSince = ref<Date | null>(null)
  const watchingUserId = ref<string | null>(null)
  // Single active screen share (backend enforces one share at a time)
  const activeScreenShare = ref<{
    userId: string
    stream: MediaStream
  } | null>(null)
  const showSelfStream = ref(false) // Toggle for streamer to see their own screen share
  // All voice channel members across the server: channelId -> VoicePeer[]
  const voiceChannelMembers = ref<Map<string, VoicePeer[]>>(new Map())

  // Voice invites
  const activeInvites = ref<VoiceInvite[]>([])

  // Voice settings
  const voiceMode = ref<'voice-activity' | 'push-to-talk'>('voice-activity')
  const vadThreshold = ref(15)
  const pttKey = ref('Space')

  // Load persisted settings
  try {
    const stored = localStorage.getItem('fluffwire-voice-settings')
    if (stored) {
      const s = JSON.parse(stored)
      if (s.voiceMode) voiceMode.value = s.voiceMode
      if (typeof s.vadThreshold === 'number') vadThreshold.value = s.vadThreshold
      if (s.pttKey) pttKey.value = s.pttKey
    }
  } catch { /* ignore */ }

  // PTT key listeners
  function handleKeyDown(e: KeyboardEvent) {
    if (voiceMode.value !== 'push-to-talk') return
    if (!currentChannelId.value) return
    if (e.code === pttKey.value && !e.repeat) {
      webrtcService.setPttActive(true)
    }
  }
  function handleKeyUp(e: KeyboardEvent) {
    if (voiceMode.value !== 'push-to-talk') return
    if (e.code === pttKey.value) {
      webrtcService.setPttActive(false)
    }
  }
  // Mute/Deafen keyboard shortcuts
  function handleShortcut(e: KeyboardEvent) {
    if (!currentChannelId.value) return
    // Ignore if typing in an input/textarea/contenteditable
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'm') {
      e.preventDefault()
      toggleMute()
    } else if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      toggleDeafen()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keydown', handleShortcut)
  window.addEventListener('keyup', handleKeyUp)

  const isInVoice = computed(() => currentChannelId.value !== null)

  function getVoiceChannelMembers(channelId: string): VoicePeer[] {
    return voiceChannelMembers.value.get(channelId) ?? []
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.VOICE_STATE_UPDATE, (data: unknown) => {
      const state = data as {
        userId: string
        channelId: string | null
        selfMute: boolean
        selfDeaf: boolean
        streaming?: boolean
        username: string
        displayName: string
        avatar: string | null
      }

      // Remove user from all voice channels first
      if (state.channelId === null) {
        // Play leave sound only if: we're in voice, someone else left, and they were in our channel
        // Don't play if it's us leaving or during WebSocket disconnect/reconnect
        const wasInOurChannel = currentChannelId.value && peers.value.some((p) => p.userId === state.userId)
        const isOtherUser = state.userId !== authStore.user?.id
        const notMassDisconnect = peers.value.length > 1 // Still have others (not a server disconnect)

        if (wasInOurChannel && isOtherUser && notMassDisconnect) {
          soundManager.play('voiceLeave')
        }
        peers.value = peers.value.filter((p) => p.userId !== state.userId)
        // Remove from voiceChannelMembers
        for (const [chId, members] of voiceChannelMembers.value) {
          const filtered = members.filter((p) => p.userId !== state.userId)
          if (filtered.length === 0) {
            voiceChannelMembers.value.delete(chId)
          } else {
            voiceChannelMembers.value.set(chId, filtered)
          }
        }
        return
      }

      const peer: VoicePeer = {
        userId: state.userId,
        username: state.username,
        displayName: state.displayName,
        avatar: state.avatar,
        selfMute: state.selfMute,
        selfDeaf: state.selfDeaf,
        speaking: false,
        streaming: state.streaming ?? false,
      }

      // Remove from any previous channel in the map
      for (const [chId, members] of voiceChannelMembers.value) {
        if (chId !== state.channelId) {
          const filtered = members.filter((p) => p.userId !== state.userId)
          if (filtered.length === 0) {
            voiceChannelMembers.value.delete(chId)
          } else {
            voiceChannelMembers.value.set(chId, filtered)
          }
        }
      }

      // Add/update in the target channel
      const channelMembers = voiceChannelMembers.value.get(state.channelId) ?? []
      const existingIdx = channelMembers.findIndex((p) => p.userId === state.userId)
      if (existingIdx !== -1) {
        channelMembers[existingIdx] = peer
      } else {
        channelMembers.push(peer)
      }
      voiceChannelMembers.value.set(state.channelId, channelMembers)

      // Update current channel peers
      if (state.channelId === currentChannelId.value) {
        const existing = peers.value.find((p) => p.userId === state.userId)
        if (existing) {
          // Detect state changes and play sounds (only for other users, not self)
          if (state.userId !== authStore.user?.id) {
            // Mute/unmute
            if (existing.selfMute !== state.selfMute) {
              soundManager.play(state.selfMute ? 'voiceMute' : 'voiceUnmute')
            }
            // Streaming start/stop
            if (existing.streaming !== (state.streaming ?? false)) {
              soundManager.play((state.streaming ?? false) ? 'streamStart' : 'streamStop')
            }
          }
          existing.selfMute = state.selfMute
          existing.selfDeaf = state.selfDeaf
          existing.streaming = state.streaming ?? false
        } else {
          peers.value.push({ ...peer })
          soundManager.play('voiceJoin')
        }
      }
    })

    wsDispatcher.register(WS_EVENTS.VOICE_SIGNAL, (data: unknown) => {
      webrtcService.handleSignal(data as VoiceSignal)
    })

    wsDispatcher.register(WS_EVENTS.VOICE_INVITE, (data: unknown) => {
      const invite = data as VoiceInvite
      // Avoid duplicate invites from the same user to the same channel
      if (activeInvites.value.some((i) => i.inviterId === invite.inviterId && i.channelId === invite.channelId)) return
      activeInvites.value.push(invite)
      // Auto-remove after 30 seconds
      setTimeout(() => {
        dismissInvite(invite.inviterId, invite.channelId)
      }, 30000)
    })

    wsDispatcher.register(WS_EVENTS.VOICE_INVITE_ERROR, (data: unknown) => {
      const error = data as { reason: string }
      const errorMessages: Record<string, string> = {
        invalid_payload: 'Failed to send invite',
        cannot_invite_self: 'You cannot invite yourself',
        not_in_channel: 'You must be in a voice channel to send invites',
        already_in_channel: 'User is already in the voice channel',
        sender_info_missing: 'Failed to send invite',
        database_error: 'Failed to send invite',
        target_not_member: 'User is not a member of this server',
      }
      const message = errorMessages[error.reason] || 'Failed to send voice invite'

      // Import toast dynamically to avoid circular dependencies
      import('vue-sonner').then(({ toast }) => {
        toast.error(message)
      })
    })

    // Re-join voice channel after WebSocket reconnect
    wsDispatcher.register(WS_EVENTS.READY, async () => {
      if (currentChannelId.value && currentServerId.value) {
        const channelId = currentChannelId.value
        const serverId = currentServerId.value
        console.log('[Voice] WebSocket reconnected, rejoining voice channel...')

        // Clean up old connection and peers
        await webrtcService.leaveVoiceChannel()
        peers.value = []
        activeScreenShare.value = null
        isScreenSharing.value = false
        watchingUserId.value = null

        // Re-join
        try {
          await webrtcService.joinVoiceChannel(serverId, channelId)
          console.log('[Voice] Successfully rejoined voice channel')

          // Give backend 3 seconds to send VOICE_STATE_UPDATE events
          setTimeout(() => {
            // If still no peers after rejoin (excluding self), show warning
            const firstPeer = peers.value[0]
            if (peers.value.length === 0 || (peers.value.length === 1 && firstPeer && firstPeer.userId === authStore.user?.id)) {
              console.warn('[Voice] No peers received after rejoin, voice state may be stale')
              // Note: Don't auto-disconnect here as other users might still be present
              // User can manually leave/rejoin if needed
            }
          }, 3000)
        } catch (e) {
          console.error('[Voice] Failed to rejoin after reconnect:', e)
          currentChannelId.value = null
          currentServerId.value = null
          // Show toast notification to user
          import('vue-sonner').then(({ toast }) => {
            toast.error('Voice connection lost. Please rejoin the channel.')
          }).catch(() => {
            console.error('[Voice] Failed to show reconnection error toast')
          })
        }
      }
    })
  }
  setupWsHandlers()

  webrtcService.onPeerSpeaking = (userId: string, speaking: boolean) => {
    // 'local' means self — resolve to actual user ID
    const resolvedId = userId === 'local' ? useAuthStore().user?.id : userId
    if (!resolvedId) return
    const peer = peers.value.find((p) => p.userId === resolvedId)
    if (peer) peer.speaking = speaking
    // Also update in voiceChannelMembers for sidebar indicators
    if (currentChannelId.value) {
      const members = voiceChannelMembers.value.get(currentChannelId.value)
      const member = members?.find((p) => p.userId === resolvedId)
      if (member) member.speaking = speaking
    }
  }

  webrtcService.onRemoteVideoStream = (userId: string, stream: MediaStream) => {
    activeScreenShare.value = { userId, stream }

    // Auto-watch when screen share starts (if not already watching someone else)
    if (!watchingUserId.value) {
      watchingUserId.value = userId
    }
  }

  webrtcService.onRemoteVideoRemoved = (userId: string) => {
    if (activeScreenShare.value?.userId === userId) {
      activeScreenShare.value = null
    }
    if (watchingUserId.value === userId) {
      watchingUserId.value = null
    }
  }

  webrtcService.onLocalScreenShareStopped = () => {
    // Update UI state when browser's "Stop sharing" button is clicked
    isScreenSharing.value = false
    showSelfStream.value = false

    // If watching own stream, stop watching
    const currentUserId = useAuthStore().user?.id
    if (currentUserId && watchingUserId.value === currentUserId) {
      watchingUserId.value = null
    }

    // Clear active screen share if it was ours
    if (currentUserId && activeScreenShare.value?.userId === currentUserId) {
      activeScreenShare.value = null
    }
  }

  function dismissInvite(inviterId: string, channelId: string) {
    activeInvites.value = activeInvites.value.filter(
      (i) => !(i.inviterId === inviterId && i.channelId === channelId)
    )
  }

  async function joinChannel(serverId: string, channelId: string) {
    isConnecting.value = true
    try {
      // Clear peers from previous channel to prevent state mixing
      peers.value = []

      await webrtcService.joinVoiceChannel(serverId, channelId)
      currentChannelId.value = channelId
      currentServerId.value = serverId
      connectedSince.value = new Date()
      // Don't play sound when YOU join - only when others join (line 169)
    } finally {
      isConnecting.value = false
    }
  }

  async function leaveChannel() {
    await webrtcService.leaveVoiceChannel()
    currentChannelId.value = null
    currentServerId.value = null
    peers.value = []
    isScreenSharing.value = false
    connectedSince.value = null
    watchingUserId.value = null
    activeScreenShare.value = null
  }

  async function startScreenShare() {
    await webrtcService.startScreenShare()
    isScreenSharing.value = true
    showSelfStream.value = true // Auto-show self-view when starting stream
  }

  async function stopScreenShare() {
    await webrtcService.stopScreenShare()
    isScreenSharing.value = false
    showSelfStream.value = false // Hide self-view when stopping stream
  }

  function watchStream(userId: string) {
    watchingUserId.value = userId
  }

  function toggleSelfView() {
    showSelfStream.value = !showSelfStream.value
  }

  function stopWatching() {
    watchingUserId.value = null
  }

  function getScreenStream(userId: string): MediaStream | null {
    return activeScreenShare.value?.userId === userId
      ? activeScreenShare.value.stream
      : null
  }

  function toggleMute() {
    isMuted.value = webrtcService.toggleMute()
  }

  function toggleDeafen() {
    isDeafened.value = webrtcService.toggleDeafen()
    if (isDeafened.value) isMuted.value = true
  }

  function setVoiceMode(mode: 'voice-activity' | 'push-to-talk') {
    voiceMode.value = mode
    webrtcService.setVoiceMode(mode)
    saveVoiceSettings()
  }

  function setVadThreshold(threshold: number) {
    vadThreshold.value = threshold
    webrtcService.setVadThreshold(threshold)
    saveVoiceSettings()
  }

  function setPttKey(key: string) {
    pttKey.value = key
    saveVoiceSettings()
  }

  function saveVoiceSettings() {
    localStorage.setItem('fluffwire-voice-settings', JSON.stringify({
      voiceMode: voiceMode.value,
      vadThreshold: vadThreshold.value,
      pttKey: pttKey.value,
    }))
    webrtcService.saveVoiceSettings()
    import('@/stores/settings').then(({ useSettingsStore }) => {
      const settingsStore = useSettingsStore()
      if (settingsStore.isFetched) {
        settingsStore.updateSetting({
          voiceMode: voiceMode.value,
          vadThreshold: vadThreshold.value,
          pttKey: pttKey.value,
        })
      }
    })
  }

  function setInitialVoiceStates(states: Array<{
    userId: string
    username: string
    displayName: string
    avatar: string | null
    channelId: string
    selfMute: boolean
    selfDeaf: boolean
    streaming: boolean
  }>) {
    // Group states by channelId
    const channelMap = new Map<string, VoicePeer[]>()

    for (const state of states) {
      const peer: VoicePeer = {
        userId: state.userId,
        username: state.username,
        displayName: state.displayName,
        avatar: state.avatar,
        selfMute: state.selfMute,
        selfDeaf: state.selfDeaf,
        speaking: false,
        streaming: state.streaming,
      }

      const existing = channelMap.get(state.channelId) || []
      existing.push(peer)
      channelMap.set(state.channelId, existing)
    }

    // Replace voiceChannelMembers with the new map
    voiceChannelMembers.value = channelMap
  }

  return {
    currentChannelId,
    currentServerId,
    peers,
    isMuted,
    isDeafened,
    isConnecting,
    isInVoice,
    isScreenSharing,
    connectedSince,
    watchingUserId,
    activeScreenShare,
    showSelfStream,
    voiceChannelMembers,
    activeInvites,
    getVoiceChannelMembers,
    dismissInvite,
    voiceMode,
    vadThreshold,
    pttKey,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    watchStream,
    stopWatching,
    getScreenStream,
    toggleSelfView,
    setVoiceMode,
    setVadThreshold,
    setPttKey,
    setInitialVoiceStates,
  }
})
