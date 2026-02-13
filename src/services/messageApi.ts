import api from './api'
import { API } from '@/constants/endpoints'
import type { Message, MessagePage, EditMessagePayload, Attachment } from '@/types'

export const messageApi = {
  getMessages(channelId: string, cursor?: string, limit = 50): Promise<{ data: MessagePage }> {
    const params: Record<string, string | number> = { limit }
    if (cursor) params.cursor = cursor
    return api.get(API.CHANNELS.MESSAGES(channelId), { params })
  },

  createMessage(channelId: string, content: string, attachments?: { id: string; filename: string; url: string; contentType: string; size: number }[], replyToId?: string): Promise<{ data: Message }> {
    return api.post(API.CHANNELS.MESSAGES(channelId), { content, attachments, replyToId })
  },

  editMessage(channelId: string, messageId: string, payload: EditMessagePayload): Promise<{ data: unknown }> {
    return api.patch(API.CHANNELS.MESSAGE_BY_ID(channelId, messageId), payload)
  },

  deleteMessage(channelId: string, messageId: string): Promise<void> {
    return api.delete(API.CHANNELS.MESSAGE_BY_ID(channelId, messageId))
  },

  sendTyping(channelId: string): Promise<void> {
    return api.post(API.CHANNELS.TYPING(channelId))
  },

  pinMessage(channelId: string, messageId: string): Promise<{ data: Message }> {
    return api.put(API.CHANNELS.PIN(channelId, messageId))
  },

  unpinMessage(channelId: string, messageId: string): Promise<void> {
    return api.delete(API.CHANNELS.PIN(channelId, messageId))
  },

  getPinnedMessages(channelId: string): Promise<{ data: Message[] }> {
    return api.get(API.CHANNELS.PINS(channelId))
  },

  toggleReaction(channelId: string, messageId: string, emoji: string): Promise<{ data: { reactions: import('@/types').Reaction[] } }> {
    return api.put(API.CHANNELS.REACTION(channelId, messageId, emoji))
  },

  searchMessages(channelId: string, params: {
    q: string
    from?: string
    has?: string
    before?: string
    after?: string
    limit?: number
    offset?: number
  }): Promise<{ data: { messages: Message[]; total: number } }> {
    return api.get(API.CHANNELS.SEARCH(channelId), { params })
  },
}
