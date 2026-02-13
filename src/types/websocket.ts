export const WsOpCode = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  PRESENCE_UPDATE: 3,
  VOICE_STATE_UPDATE: 4,
  RESUME: 6,
  RECONNECT: 7,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const

export type WsOpCode = (typeof WsOpCode)[keyof typeof WsOpCode]

export interface WsMessage {
  op: WsOpCode
  d: unknown
  s?: number  // sequence number
  t?: string  // event name (when op=DISPATCH)
}

export interface WsHelloPayload {
  heartbeatInterval: number
}

export interface WsIdentifyPayload {
  token: string
}

// Dispatch event names
export type WsEventName =
  | 'READY'
  | 'MESSAGE_CREATE'
  | 'MESSAGE_UPDATE'
  | 'MESSAGE_DELETE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_UPDATE'
  | 'CHANNEL_DELETE'
  | 'SERVER_CREATE'
  | 'SERVER_UPDATE'
  | 'SERVER_DELETE'
  | 'SERVER_MEMBER_ADD'
  | 'SERVER_MEMBER_REMOVE'
  | 'PRESENCE_UPDATE'
  | 'TYPING_START'
  | 'VOICE_STATE_UPDATE'
  | 'VOICE_SIGNAL'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPT'
  | 'FRIEND_REMOVE'
  | 'DM_CREATE'
  | 'MESSAGE_PIN'
  | 'MESSAGE_UNPIN'
