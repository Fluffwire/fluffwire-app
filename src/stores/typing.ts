import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wsService } from '@/services/websocket'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

interface TypingUser {
  userId: string
  username: string
  timeout: ReturnType<typeof setTimeout>
}

export const useTypingStore = defineStore('typing', () => {
  // Map of channelId -> Map of userId -> TypingUser
  const typingByChannel = ref<Map<string, Map<string, TypingUser>>>(new Map())
  const lastTypingSent = ref<Map<string, number>>(new Map())

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.TYPING_START, (data: unknown) => {
      const { userId, username, channelId, isBot } = data as {
        userId: string
        username: string
        channelId: string
        isBot?: boolean
      }

      // Get or create the typing users map for this channel
      let channelTyping = typingByChannel.value.get(channelId)
      if (!channelTyping) {
        channelTyping = new Map()
        typingByChannel.value.set(channelId, channelTyping)
      }

      // Clear existing timeout if user was already typing
      const existing = channelTyping.get(userId)
      if (existing) clearTimeout(existing.timeout)

      // Use longer timeout for bots (90s for LLM processing), shorter for users (8s)
      const timeoutDuration = isBot ? 90000 : 8000
      const timeout = setTimeout(() => {
        const users = typingByChannel.value.get(channelId)
        if (users) {
          users.delete(userId)
          if (users.size === 0) {
            typingByChannel.value.delete(channelId)
          }
        }
      }, timeoutDuration)

      channelTyping.set(userId, { userId, username, timeout })
    })

    wsDispatcher.register(WS_EVENTS.TYPING_STOP, (data: unknown) => {
      const { userId, channelId } = data as {
        userId: string
        channelId: string
      }

      // Immediately remove user from typing list
      const channelTyping = typingByChannel.value.get(channelId)
      if (channelTyping) {
        const existing = channelTyping.get(userId)
        if (existing) {
          clearTimeout(existing.timeout)
          channelTyping.delete(userId)
          if (channelTyping.size === 0) {
            typingByChannel.value.delete(channelId)
          }
        }
      }
    })
  }
  setupWsHandlers()

  function getTypingUsers(channelId: string): TypingUser[] {
    const channelTyping = typingByChannel.value.get(channelId)
    return channelTyping ? Array.from(channelTyping.values()) : []
  }

  function getTypingText(channelId: string): string {
    const users = getTypingUsers(channelId)
    if (users.length === 0) {
      return ''
    } else if (users.length === 1) {
      return `${users[0]!.username} is typing...`
    } else if (users.length === 2) {
      return `${users[0]!.username} and ${users[1]!.username} are typing...`
    } else {
      return 'Several people are typing...'
    }
  }

  function sendTyping(channelId: string) {
    const now = Date.now()
    const lastSent = lastTypingSent.value.get(channelId) ?? 0
    if (now - lastSent < 3000) return
    lastTypingSent.value.set(channelId, now)
    wsService.sendDispatch('TYPING_START', { channelId })
  }

  function stopTyping(channelId: string) {
    // Only send stop if we've sent a start recently
    if (lastTypingSent.value.has(channelId)) {
      wsService.sendDispatch('TYPING_STOP', { channelId })
      lastTypingSent.value.delete(channelId)
    }
  }

  function clearChannel(channelId: string) {
    const channelTyping = typingByChannel.value.get(channelId)
    if (channelTyping) {
      // Clear all timeouts for this channel
      channelTyping.forEach(user => clearTimeout(user.timeout))
      typingByChannel.value.delete(channelId)
    }
    lastTypingSent.value.delete(channelId)
  }

  return {
    typingByChannel,
    getTypingUsers,
    getTypingText,
    sendTyping,
    stopTyping,
    clearChannel,
  }
})
