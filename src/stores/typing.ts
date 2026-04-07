import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
      const { userId, username, channelId } = data as {
        userId: string
        username: string
        channelId: string
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

      // Set new timeout to remove user after 8 seconds
      const timeout = setTimeout(() => {
        const users = typingByChannel.value.get(channelId)
        if (users) {
          users.delete(userId)
          if (users.size === 0) {
            typingByChannel.value.delete(channelId)
          }
        }
      }, 8000)

      channelTyping.set(userId, { userId, username, timeout })
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
    clearChannel,
  }
})
