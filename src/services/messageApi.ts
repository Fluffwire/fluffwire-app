import api from './api'
import { API } from '@/constants/endpoints'
import type { Message, MessagePage, EditMessagePayload, Attachment } from '@/types'

export const messageApi = {
  getMessages(channelId: string, cursor?: string, limit = 50): Promise<{ data: MessagePage }> {
    const params: Record<string, string | number> = { limit }
    if (cursor) params.cursor = cursor
    return api.get(API.CHANNELS.MESSAGES(channelId), { params })
  },

  createMessage(channelId: string, content: string, attachments?: Omit<Attachment, 'id'>[]): Promise<{ data: Message }> {
    return api.post(API.CHANNELS.MESSAGES(channelId), { content, attachments })
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
}
