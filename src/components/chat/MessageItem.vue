<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { renderMarkdown } from '@/composables/useMarkdown'

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

const renderedContent = computed(() => renderMarkdown(props.message.content))

const imageAttachments = computed(() =>
  (props.message.attachments ?? []).filter((a) => a.contentType.startsWith('image/'))
)

const fileAttachments = computed(() =>
  (props.message.attachments ?? []).filter((a) => !a.contentType.startsWith('image/'))
)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
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
          <div class="message-content text-sm text-foreground/90 break-words" v-html="renderedContent" />

          <!-- Image attachments -->
          <div v-if="imageAttachments.length" class="mt-1 flex flex-col gap-1">
            <a
              v-for="att in imageAttachments"
              :key="att.id"
              :href="att.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="att.url"
                :alt="att.filename"
                class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain"
              />
            </a>
          </div>

          <!-- File attachments -->
          <div v-if="fileAttachments.length" class="mt-1 flex flex-col gap-1">
            <a
              v-for="att in fileAttachments"
              :key="att.id"
              :href="att.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <span class="truncate">{{ att.filename }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ formatFileSize(att.size) }}</span>
            </a>
          </div>
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
          <div class="message-content text-sm text-foreground/90 break-words" v-html="renderedContent" />

          <!-- Image attachments -->
          <div v-if="imageAttachments.length" class="mt-1 flex flex-col gap-1">
            <a
              v-for="att in imageAttachments"
              :key="att.id"
              :href="att.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="att.url"
                :alt="att.filename"
                class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain"
              />
            </a>
          </div>

          <!-- File attachments -->
          <div v-if="fileAttachments.length" class="mt-1 flex flex-col gap-1">
            <a
              v-for="att in fileAttachments"
              :key="att.id"
              :href="att.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <span class="truncate">{{ att.filename }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ formatFileSize(att.size) }}</span>
            </a>
          </div>
        </div>
      </template>
    </TooltipProvider>
  </div>
</template>
