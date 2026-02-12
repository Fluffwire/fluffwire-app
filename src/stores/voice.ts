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

  const isInVoice = computed(() => currentChannelId.value !== null)

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

      if (state.channelId === null) {
        peers.value = peers.value.filter((p) => p.userId !== state.userId)
        return
      }

      if (state.channelId === currentChannelId.value) {
        const existing = peers.value.find((p) => p.userId === state.userId)
        if (existing) {
          existing.selfMute = state.selfMute
          existing.selfDeaf = state.selfDeaf
        } else {
          peers.value.push({
            userId: state.userId,
            username: state.username,
            displayName: state.displayName,
            avatar: state.avatar,
            selfMute: state.selfMute,
            selfDeaf: state.selfDeaf,
            speaking: false,
          })
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
    isMuted.value = false
    isDeafened.value = false
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
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
  }
})
