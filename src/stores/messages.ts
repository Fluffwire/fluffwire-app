import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, Reaction, CreateMessagePayload } from '@/types'
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
  const pinnedMessages = ref<Map<string, Message[]>>(new Map())
  const replyingTo = ref<Map<string, Message>>(new Map())

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
      // Also remove from pinned cache
      const pinned = pinnedMessages.value.get(channelId)
      if (pinned) {
        pinnedMessages.value.set(channelId, pinned.filter((m) => m.id !== id))
      }
    })

    wsDispatcher.register(WS_EVENTS.MESSAGE_PIN, (data: unknown) => {
      const message = data as Message
      const messages = messagesByChannel.value.get(message.channelId)
      if (messages) {
        const idx = messages.findIndex((m) => m.id === message.id)
        if (idx !== -1) messages[idx] = message
      }
      // Add to pinned cache
      const pinned = pinnedMessages.value.get(message.channelId)
      if (pinned) {
        if (!pinned.find((m) => m.id === message.id)) {
          pinned.unshift(message)
        }
      }
    })

    wsDispatcher.register(WS_EVENTS.MESSAGE_REACTION_UPDATE, (data: unknown) => {
      const { messageId, channelId, reactions } = data as { messageId: string; channelId: string; reactions: Reaction[] }
      const messages = messagesByChannel.value.get(channelId)
      if (messages) {
        const msg = messages.find((m) => m.id === messageId)
        if (msg) msg.reactions = reactions
      }
    })

    wsDispatcher.register(WS_EVENTS.MESSAGE_UNPIN, (data: unknown) => {
      const message = data as Message
      const messages = messagesByChannel.value.get(message.channelId)
      if (messages) {
        const idx = messages.findIndex((m) => m.id === message.id)
        if (idx !== -1) messages[idx] = message
      }
      // Remove from pinned cache
      const pinned = pinnedMessages.value.get(message.channelId)
      if (pinned) {
        pinnedMessages.value.set(message.channelId, pinned.filter((m) => m.id !== message.id))
      }
    })
  }
  setupWsHandlers()

  async function fetchMessages(channelId: string, loadMore = false) {
    isLoading.value = true
    try {
      const cursor = loadMore ? cursors.value.get(channelId) ?? undefined : undefined
      const { data } = await messageApi.getMessages(channelId, cursor)

      // Ensure all messages have reactions array initialized
      const messagesWithReactions = data.messages.map(msg => ({
        ...msg,
        reactions: msg.reactions ?? []
      }))

      if (loadMore) {
        const existing = messagesByChannel.value.get(channelId) ?? []
        messagesByChannel.value.set(channelId, [...messagesWithReactions, ...existing])
      } else {
        messagesByChannel.value.set(channelId, messagesWithReactions)
      }

      cursors.value.set(channelId, data.cursor)
      hasMore.value.set(channelId, data.hasMore)
    } finally {
      isLoading.value = false
    }
  }

  function setReplyTo(channelId: string, message: Message) {
    replyingTo.value.set(channelId, message)
  }

  function getReplyTo(channelId: string): Message | undefined {
    return replyingTo.value.get(channelId)
  }

  function clearReply(channelId: string) {
    replyingTo.value.delete(channelId)
  }

  function sendMessage(payload: CreateMessagePayload) {
    const reply = replyingTo.value.get(payload.channelId)
    if (reply) {
      payload.replyToId = reply.id
      replyingTo.value.delete(payload.channelId)
    }
    wsService.sendDispatch('MESSAGE_CREATE', payload)
  }

  async function sendMessageWithAttachments(channelId: string, content: string, attachments: { id: string; filename: string; url: string; contentType: string; size: number }[]) {
    const reply = replyingTo.value.get(channelId)
    const replyToId = reply?.id
    if (reply) replyingTo.value.delete(channelId)
    await messageApi.createMessage(channelId, content, attachments, replyToId)
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

  async function fetchPinnedMessages(channelId: string) {
    const { data } = await messageApi.getPinnedMessages(channelId)
    pinnedMessages.value.set(channelId, data)
  }

  function getPinnedMessages(channelId: string): Message[] {
    return pinnedMessages.value.get(channelId) ?? []
  }

  async function toggleReaction(channelId: string, messageId: string, emoji: string) {
    await messageApi.toggleReaction(channelId, messageId, emoji)
  }

  async function pinMessage(channelId: string, messageId: string) {
    await messageApi.pinMessage(channelId, messageId)
  }

  async function unpinMessage(channelId: string, messageId: string) {
    await messageApi.unpinMessage(channelId, messageId)
  }

  return {
    messagesByChannel,
    isLoading,
    pinnedMessages,
    replyingTo,
    getMessages,
    fetchMessages,
    sendMessage,
    sendMessageWithAttachments,
    editMessage,
    deleteMessage,
    channelHasMore,
    clearChannel,
    fetchPinnedMessages,
    getPinnedMessages,
    toggleReaction,
    pinMessage,
    unpinMessage,
    setReplyTo,
    getReplyTo,
    clearReply,
  }
})
