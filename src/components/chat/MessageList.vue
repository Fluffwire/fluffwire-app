<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { useReadStateStore } from '@/stores/readState'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import MessageItem from './MessageItem.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Hash } from 'lucide-vue-next'

interface Props {
  channelId: string
  channelName?: string
  isServerOwner?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isServerOwner: false,
})
const messagesStore = useMessagesStore()
const authStore = useAuthStore()
const readStateStore = useReadStateStore()

async function handleEdit(messageId: string, content: string) {
  await messagesStore.editMessage(props.channelId, messageId, content)
}

async function handleDelete(messageId: string) {
  await messagesStore.deleteMessage(props.channelId, messageId)
}

async function handlePin(messageId: string) {
  await messagesStore.pinMessage(props.channelId, messageId)
}

async function handleUnpin(messageId: string) {
  await messagesStore.unpinMessage(props.channelId, messageId)
}

async function handleReaction(messageId: string, emoji: string) {
  await messagesStore.toggleReaction(props.channelId, messageId, emoji)
}
const containerRef = ref<HTMLElement | null>(null)
const scrollEnabled = ref(false)

const messages = computed(() => messagesStore.getMessages(props.channelId))
const hasMore = computed(() => messagesStore.channelHasMore(props.channelId))

async function loadMore() {
  if (!hasMore.value) return
  await messagesStore.fetchMessages(props.channelId, true)
}

const { isLoadingMore } = useInfiniteScroll(containerRef, loadMore, { direction: 'top', enabled: scrollEnabled })

watch(() => props.channelId, async (id) => {
  if (id) {
    scrollEnabled.value = false
    await messagesStore.fetchMessages(id)
    await nextTick()
    // Use rAF to ensure layout is complete before scrolling
    requestAnimationFrame(() => {
      scrollToBottom()
      // Enable infinite scroll after scroll position is set
      setTimeout(() => { scrollEnabled.value = true }, 150)
    })
    readStateStore.markAsRead(id)
  }
}, { immediate: true })

watch(() => messages.value.length, async () => {
  await nextTick()
  if (containerRef.value) {
    const el = containerRef.value
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    // Only auto-scroll if near bottom and not loading more messages at the top
    if (isNearBottom && !isLoadingMore.value) {
      scrollToBottom()
    }
  }
  // Mark as read when new messages arrive while viewing this channel
  if (!document.hidden) {
    readStateStore.markAsRead(props.channelId)
  }
})

function scrollToBottom() {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
}

function scrollToMessage(messageId: string) {
  if (!containerRef.value) return
  const el = containerRef.value.querySelector(`[data-message-id="${messageId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('bg-primary/10')
    setTimeout(() => el.classList.remove('bg-primary/10'), 2000)
  }
}

defineExpose({ scrollToMessage })
</script>

<template>
  <div ref="containerRef" class="flex-1 overflow-y-auto">
    <div class="flex min-h-full flex-col">
      <!-- Spacer pushes messages to bottom when few -->
      <div class="flex-1" />

      <!-- Loading more skeleton -->
      <div v-if="isLoadingMore" class="space-y-4 p-4">
        <div v-for="i in 3" :key="i" class="flex gap-4">
          <Skeleton class="h-10 w-10 rounded-full shrink-0" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-4 w-full" />
          </div>
        </div>
      </div>

      <!-- Welcome message -->
      <Card v-if="messages.length === 0 && !messagesStore.isLoading" class="mx-4 mb-4 border-border/50">
        <div class="p-6 text-center">
          <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Hash class="h-8 w-8 text-primary" />
          </div>
          <h3 class="text-xl font-bold text-foreground">Welcome to #{{ channelName ?? channelId }}!</h3>
          <p class="mt-1 text-muted-foreground">This is the start of the conversation.</p>
        </div>
      </Card>

      <!-- Initial loading skeleton -->
      <div v-if="messagesStore.isLoading && messages.length === 0" class="space-y-4 p-4">
        <div v-for="i in 6" :key="i" class="flex gap-4">
          <Skeleton class="h-10 w-10 rounded-full shrink-0" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-4" :style="{ width: `${40 + Math.random() * 40}%` }" />
          </div>
        </div>
      </div>

      <MessageItem
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :show-author="index === 0 || messages[index - 1]?.author.id !== message.author.id"
        :current-user-id="authStore.user?.id"
        :can-delete="isServerOwner"
        @edit="handleEdit"
        @delete="handleDelete"
        @pin="handlePin"
        @unpin="handleUnpin"
        @reaction="handleReaction"
      />

      <!-- Bottom padding so last message isn't flush against input -->
      <div class="h-4" />
    </div>
  </div>
</template>
