export * from './user'
export * from './server'
export * from './message'
export * from './voice'
export * from './websocket'

export interface Friend {
  id: string
  user: {
    id: string
    username: string
    displayName: string
    avatar: string | null
    status: import('./user').UserStatus
  }
  since: string
}

export interface FriendRequest {
  id: string
  from: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }
  to: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }
  createdAt: string
}

export interface DirectMessageChannel {
  id: string
  recipientId: string
  recipient: {
    id: string
    username: string
    displayName: string
    avatar: string | null
    status: import('./user').UserStatus
  }
  lastMessage: {
    content: string
    timestamp: string
  } | null
}
