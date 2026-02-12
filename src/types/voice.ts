export interface VoiceState {
  userId: string
  channelId: string
  serverId: string
  selfMute: boolean
  selfDeaf: boolean
}

export interface VoicePeer {
  userId: string
  username: string
  displayName: string
  avatar: string | null
  selfMute: boolean
  selfDeaf: boolean
  speaking: boolean
}

export interface VoiceSignal {
  type: 'offer' | 'answer' | 'ice-candidate'
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit
  fromUserId?: string
}

export interface MediaDeviceOption {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}
