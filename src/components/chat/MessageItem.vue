<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

const shortTime = computed(() => {
  return new Date(props.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div
    :class="[
      'group relative flex gap-4 px-4 py-0.5 transition-colors hover:bg-accent/30 rounded-lg mx-2',
      showAuthor ? 'mt-4' : '',
    ]"
  >
    <TooltipProvider>
      <template v-if="showAuthor">
        <div class="mt-0.5 shrink-0">
          <UserAvatar
            :src="message.author.avatar"
            :alt="message.author.displayName"
            size="md"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-foreground hover:text-primary cursor-pointer">
              {{ message.author.displayName }}
            </span>
            <Tooltip>
              <TooltipTrigger as-child>
                <span class="text-xs text-muted-foreground">{{ formattedTime }}</span>
              </TooltipTrigger>
              <TooltipContent>{{ formattedTime }}</TooltipContent>
            </Tooltip>
            <span v-if="message.editedAt" class="text-xs text-muted-foreground">(edited)</span>
          </div>
          <div class="text-sm text-foreground/90 break-words">{{ message.content }}</div>
        </div>
      </template>

      <template v-else>
        <div class="w-10 shrink-0">
          <Tooltip>
            <TooltipTrigger as-child>
              <span class="invisible text-xs text-muted-foreground group-hover:visible">
                {{ shortTime }}
              </span>
            </TooltipTrigger>
            <TooltipContent>{{ formattedTime }}</TooltipContent>
          </Tooltip>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm text-foreground/90 break-words">{{ message.content }}</div>
        </div>
      </template>
    </TooltipProvider>
  </div>
</template>
