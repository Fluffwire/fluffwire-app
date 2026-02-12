import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, Attachment, CreateMessagePayload } from '@/types'
import { WsOpCode } from '@/types/websocket'
import { messageApi } from '@/services/messageApi'
import { wsService } from '@/services/websocket'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

export const useMessagesStore = defineStore('messages', () => {
  // Map of channelId -> messages
  const messagesByChannel = ref<Map<string, Message[]>>(new Map())
  const cursors = ref<Map<string, string | null>>(new Map())
  const hasMore = ref<Map<string, boolean>>(new Map())
  const isLoading = ref(false)

  function getMessages(channelId: string): Message[] {
    return messagesByChannel.value.get(channelId) ?? []
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.MESSAGE_CREATE, (data: unknown) => {
      const message = data as Message
      const messages = messagesByChannel.value.get(message.channelId) ?? []
      messages.push(message)
      messagesByChannel.value.set(message.channelId, messages)
    })

    wsDispatcher.register(WS_EVENTS.MESSAGE_UPDATE, (data: unknown) => {
      const updated = data as Message
      const messages = messagesByChannel.value.get(updated.channelId)
      if (messages) {
        const idx = messages.findIndex((m) => m.id === updated.id)
        if (idx !== -1) messages[idx] = updated
      }
    })

    wsDispatcher.register(WS_EVENTS.MESSAGE_DELETE, (data: unknown) => {
      const { id, channelId } = data as { id: string; channelId: string }
      const messages = messagesByChannel.value.get(channelId)
      if (messages) {
        messagesByChannel.value.set(
          channelId,
          messages.filter((m) => m.id !== id)
        )
      }
    })
  }
  setupWsHandlers()

  async function fetchMessages(channelId: string, loadMore = false) {
    isLoading.value = true
    try {
      const cursor = loadMore ? cursors.value.get(channelId) ?? undefined : undefined
      const { data } = await messageApi.getMessages(channelId, cursor)

      if (loadMore) {
        const existing = messagesByChannel.value.get(channelId) ?? []
        messagesByChannel.value.set(channelId, [...data.messages, ...existing])
      } else {
        messagesByChannel.value.set(channelId, data.messages)
      }

      cursors.value.set(channelId, data.cursor)
      hasMore.value.set(channelId, data.hasMore)
    } finally {
      isLoading.value = false
    }
  }

  function sendMessage(payload: CreateMessagePayload) {
    wsService.sendDispatch('MESSAGE_CREATE', payload)
  }

  async function sendMessageWithAttachments(channelId: string, content: string, attachments: { id: string; filename: string; url: string; contentType: string; size: number }[]) {
    await messageApi.createMessage(channelId, content, attachments)
    // The WS MESSAGE_CREATE event will add it to the store
  }

  async function editMessage(channelId: string, messageId: string, content: string) {
    await messageApi.editMessage(channelId, messageId, { content })
  }

  async function deleteMessage(channelId: string, messageId: string) {
    await messageApi.deleteMessage(channelId, messageId)
  }

  function channelHasMore(channelId: string): boolean {
    return hasMore.value.get(channelId) ?? true
  }

  function clearChannel(channelId: string) {
    messagesByChannel.value.delete(channelId)
    cursors.value.delete(channelId)
    hasMore.value.delete(channelId)
  }

  return {
    messagesByChannel,
    isLoading,
    getMessages,
    fetchMessages,
    sendMessage,
    sendMessageWithAttachments,
    editMessage,
    deleteMessage,
    channelHasMore,
    clearChannel,
  }
})
