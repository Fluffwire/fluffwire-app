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
  streaming: boolean
}

export interface VoiceSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'screen-share' | 'screen-stop'
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit
  fromUserId?: string
}

export interface MediaDeviceOption {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export interface VoiceInvite {
  inviterId: string
  inviterName: string
  inviterAvatar: string | null
  channelId: string
  channelName?: string
  serverId: string
}
