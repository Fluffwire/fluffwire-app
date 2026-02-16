export type ChannelType = 'text' | 'voice'

export type ChannelAccessMode = 'open' | 'read_only' | 'private' | 'restricted_write'

export interface Channel {
  id: string
  serverId: string
  name: string
  type: ChannelType
  categoryId: string | null
  position: number
  topic?: string
  accessMode: ChannelAccessMode
  allowedUserIds?: string[]
  allowedLabelIds?: string[]
  maxParticipants?: number
  uploadsEnabled: boolean
}

export interface ChannelCategory {
  id: string
  serverId: string
  name: string
  position: number
}

export interface MessageReply {
  id: string
  author: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }
  content: string
}

export interface Message {
  id: string
  channelId: string
  author: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }
  content: string
  timestamp: string
  editedAt: string | null
  attachments: Attachment[]
  reactions: Reaction[]
  pinned?: boolean
  pinnedBy?: string | null
  pinnedAt?: string | null
  webhookId?: string | null
  replyTo?: MessageReply
  mentions?: string[]
}

export interface Reaction {
  emoji: string
  count: number
  userIds: string[]
}

export interface Attachment {
  id: string
  filename: string
  url: string
  contentType: string
  size: number
}

export interface CreateMessagePayload {
  content: string
  channelId: string
  replyToId?: string
}

export interface EditMessagePayload {
  content: string
}

export interface MessagePage {
  messages: Message[]
  hasMore: boolean
  cursor: string | null
}

export interface CreateChannelPayload {
  name: string
  type: ChannelType
  categoryId?: string
  accessMode?: ChannelAccessMode
}
