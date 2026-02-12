import { useVoiceStore } from '@/stores/voice'
import { storeToRefs } from 'pinia'

export function useVoice() {
  const voiceStore = useVoiceStore()
  const { currentChannelId, currentServerId, peers, isMuted, isDeafened, isConnecting, isInVoice } =
    storeToRefs(voiceStore)

  return {
    currentChannelId,
    currentServerId,
    peers,
    isMuted,
    isDeafened,
    isConnecting,
    isInVoice,
    joinChannel: voiceStore.joinChannel,
    leaveChannel: voiceStore.leaveChannel,
    toggleMute: voiceStore.toggleMute,
    toggleDeafen: voiceStore.toggleDeafen,
  }
}
