export type ChannelType = 'text' | 'voice'

export interface Channel {
  id: string
  serverId: string
  name: string
  type: ChannelType
  categoryId: string | null
  position: number
  topic?: string
}

export interface ChannelCategory {
  id: string
  serverId: string
  name: string
  position: number
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
}
