import { ref, onUnmounted, type Ref } from 'vue'
import { wsService } from '@/services/websocket'
import { WS_EVENTS } from '@/constants/events'

interface TypingUser {
  userId: string
  username: string
  timeout: ReturnType<typeof setTimeout>
}

export function useTypingIndicator(channelId: Ref<string>) {
  const typingUsers = ref<Map<string, TypingUser>>(new Map())
  let lastTypingSent = 0

  function handleTypingStart(data: unknown) {
    const { userId, username, channelId: eventChannelId } = data as {
      userId: string
      username: string
      channelId: string
    }
    if (eventChannelId !== channelId.value) return

    const existing = typingUsers.value.get(userId)
    if (existing) clearTimeout(existing.timeout)

    const timeout = setTimeout(() => {
      typingUsers.value.delete(userId)
    }, 8000)

    typingUsers.value.set(userId, { userId, username, timeout })
  }

  wsService.on(WS_EVENTS.TYPING_START, handleTypingStart)
  onUnmounted(() => wsService.off(WS_EVENTS.TYPING_START, handleTypingStart))

  function sendTyping() {
    const now = Date.now()
    if (now - lastTypingSent < 3000) return
    lastTypingSent = now
    wsService.sendDispatch('TYPING_START', { channelId: channelId.value })
  }

  const typingText = ref('')
  function updateTypingText() {
    const users = Array.from(typingUsers.value.values())
    if (users.length === 0) {
      typingText.value = ''
    } else if (users.length === 1) {
      typingText.value = `${users[0]!.username} is typing...`
    } else if (users.length === 2) {
      typingText.value = `${users[0]!.username} and ${users[1]!.username} are typing...`
    } else {
      typingText.value = 'Several people are typing...'
    }
  }

  return {
    typingUsers,
    typingText,
    sendTyping,
    updateTypingText,
  }
}
