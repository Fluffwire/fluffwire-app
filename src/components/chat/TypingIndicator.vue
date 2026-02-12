<script setup lang="ts">
import { ref, watch } from 'vue'
import { wsService } from '@/services/websocket'
import { WS_EVENTS } from '@/constants/events'
import { onUnmounted } from 'vue'

interface Props {
  channelId: string
}

const props = defineProps<Props>()

interface TypingUser {
  userId: string
  username: string
  timer: ReturnType<typeof setTimeout>
}

const typingUsers = ref<Map<string, TypingUser>>(new Map())

function handleTypingStart(data: unknown) {
  const { userId, username, channelId } = data as {
    userId: string
    username: string
    channelId: string
  }
  if (channelId !== props.channelId) return

  const existing = typingUsers.value.get(userId)
  if (existing) clearTimeout(existing.timer)

  const timer = setTimeout(() => {
    typingUsers.value.delete(userId)
  }, 8000)

  typingUsers.value.set(userId, { userId, username, timer })
}

wsService.on(WS_EVENTS.TYPING_START, handleTypingStart)
onUnmounted(() => wsService.off(WS_EVENTS.TYPING_START, handleTypingStart))

watch(() => props.channelId, () => {
  typingUsers.value.forEach(u => clearTimeout(u.timer))
  typingUsers.value.clear()
})

function typingText(): string {
  const users = Array.from(typingUsers.value.values())
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0]!.username} is typing...`
  if (users.length === 2) return `${users[0]!.username} and ${users[1]!.username} are typing...`
  return 'Several people are typing...'
}
</script>

<template>
  <div class="absolute bottom-0 left-4 h-6 text-xs text-text-secondary">
    <span v-if="typingUsers.size > 0">{{ typingText() }}</span>
  </div>
</template>
