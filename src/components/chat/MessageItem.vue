<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

interface Props {
  message: Message
  showAuthor?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAuthor: true,
})

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  if (isToday) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }) +
    ` ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})
</script>

<template>
  <div
    :class="[
      'group relative flex gap-4 px-4 py-0.5 transition-colors hover:bg-hover-bg/30',
      showAuthor ? 'mt-4' : '',
    ]"
  >
    <template v-if="showAuthor">
      <div class="mt-0.5 shrink-0">
        <BaseAvatar
          :src="message.author.avatar"
          :alt="message.author.displayName"
          size="md"
        />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-medium text-text-primary hover:underline">
            {{ message.author.displayName }}
          </span>
          <span class="text-xs text-text-muted">{{ formattedTime }}</span>
          <span v-if="message.editedAt" class="text-xs text-text-muted">(edited)</span>
        </div>
        <div class="text-sm text-text-primary/90 break-words">{{ message.content }}</div>
      </div>
    </template>

    <template v-else>
      <div class="w-10 shrink-0">
        <span class="invisible text-xs text-text-muted group-hover:visible">
          {{ new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        </span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-sm text-text-primary/90 break-words">{{ message.content }}</div>
      </div>
    </template>
  </div>
</template>
