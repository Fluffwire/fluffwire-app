<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { useServersStore } from '@/stores/servers'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pin, X } from 'lucide-vue-next'
import { renderMarkdown } from '@/composables/useMarkdown'
import { toast } from 'vue-sonner'

interface Props {
  channelId: string
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; jumpTo: [messageId: string] }>()

const messagesStore = useMessagesStore()
const authStore = useAuthStore()
const serversStore = useServersStore()

const isLoading = ref(false)

watch(() => [props.open, props.channelId], async ([open]) => {
  if (open && props.channelId) {
    isLoading.value = true
    try {
      await messagesStore.fetchPinnedMessages(props.channelId)
    } finally {
      isLoading.value = false
    }
  }
}, { immediate: true })

const pinnedMessages = messagesStore.pinnedMessages

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isOwner = serversStore.currentServer?.ownerId === authStore.user?.id

async function handleUnpin(messageId: string) {
  try {
    await messagesStore.unpinMessage(props.channelId, messageId)
    toast.success('Message unpinned')
  } catch {
    toast.error('Failed to unpin message')
  }
}
</script>

<template>
  <div
    v-if="open"
    class="flex h-full w-80 shrink-0 flex-col border-l border-border/50 bg-card"
  >
    <div class="flex h-12 items-center justify-between border-b border-border/50 px-4">
      <div class="flex items-center gap-2">
        <Pin class="h-4 w-4 text-primary" />
        <h3 class="text-sm font-semibold text-foreground">Pinned Messages</h3>
      </div>
      <Button variant="ghost" size="icon" class="h-7 w-7" @click="emit('close')">
        <X class="h-4 w-4" />
      </Button>
    </div>

    <ScrollArea class="flex-1">
      <div class="p-3 space-y-2">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <span class="text-sm text-muted-foreground">Loading...</span>
        </div>

        <div
          v-else-if="!pinnedMessages.get(channelId)?.length"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <Pin class="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">No pinned messages yet</p>
          <p class="mt-1 text-xs text-muted-foreground/60">
            Pin important messages to find them later
          </p>
        </div>

        <div
          v-for="msg in pinnedMessages.get(channelId) ?? []"
          :key="msg.id"
          class="group rounded-lg border border-border/50 bg-background p-3 transition-colors hover:border-border"
        >
          <div class="flex items-start gap-2">
            <UserAvatar
              :src="msg.author.avatar"
              :alt="msg.author.displayName"
              size="sm"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-1.5">
                <span class="text-xs font-medium text-foreground">{{ msg.author.displayName }}</span>
                <span class="text-[10px] text-muted-foreground">{{ formatDate(msg.timestamp) }}</span>
              </div>
              <div class="mt-0.5 text-xs text-foreground/80 line-clamp-4 message-content" v-html="renderMarkdown(msg.content)" />
            </div>
          </div>
          <div class="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-xs"
              @click="emit('jumpTo', msg.id)"
            >
              Jump
            </Button>
            <Button
              v-if="isOwner || msg.author.id === authStore.user?.id"
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-xs text-destructive hover:text-destructive"
              @click="handleUnpin(msg.id)"
            >
              Unpin
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
