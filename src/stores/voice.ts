import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VoicePeer, VoiceSignal } from '@/types'
import { webrtcService } from '@/services/webrtc'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

export const useVoiceStore = defineStore('voice', () => {
  const currentChannelId = ref<string | null>(null)
  const currentServerId = ref<string | null>(null)
  const peers = ref<VoicePeer[]>([])
  const isMuted = ref(false)
  const isDeafened = ref(false)
  const isConnecting = ref(false)
  // All voice channel members across the server: channelId -> VoicePeer[]
  const voiceChannelMembers = ref<Map<string, VoicePeer[]>>(new Map())

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
        username: string
        displayName: string
        avatar: string | null
      }

      // Remove user from all voice channels first
      if (state.channelId === null) {
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
          existing.selfMute = state.selfMute
          existing.selfDeaf = state.selfDeaf
        } else {
          peers.value.push({ ...peer })
        }
      }
    })

    wsDispatcher.register(WS_EVENTS.VOICE_SIGNAL, (data: unknown) => {
      webrtcService.handleSignal(data as VoiceSignal)
    })
  }
  setupWsHandlers()

  webrtcService.onPeerSpeaking = (userId: string, speaking: boolean) => {
    const peer = peers.value.find((p) => p.userId === userId)
    if (peer) peer.speaking = speaking
  }

  async function joinChannel(serverId: string, channelId: string) {
    isConnecting.value = true
    try {
      await webrtcService.joinVoiceChannel(serverId, channelId)
      currentChannelId.value = channelId
      currentServerId.value = serverId
    } finally {
      isConnecting.value = false
    }
  }

  async function leaveChannel() {
    await webrtcService.leaveVoiceChannel()
    currentChannelId.value = null
    currentServerId.value = null
    peers.value = []
    // Persist mute/deafen state across leave/join
  }

  function toggleMute() {
    isMuted.value = webrtcService.toggleMute()
  }

  function toggleDeafen() {
    isDeafened.value = webrtcService.toggleDeafen()
    if (isDeafened.value) isMuted.value = true
  }

  return {
    currentChannelId,
    currentServerId,
    peers,
    isMuted,
    isDeafened,
    isConnecting,
    isInVoice,
    voiceChannelMembers,
    getVoiceChannelMembers,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
  }
})
