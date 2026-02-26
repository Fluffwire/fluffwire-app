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
import { Hash, ArrowDown } from 'lucide-vue-next'

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

function handleReply(message: import('@/types').Message) {
  messagesStore.setReplyTo(props.channelId, message)
}

function handleJumpTo(messageId: string) {
  scrollToMessage(messageId)
}

function handleMarkUnread(messageId: string) {
  // Find the message before this one to set as last read
  const msgs = messages.value
  const idx = msgs.findIndex(m => m.id === messageId)
  if (idx <= 0) return
  const previousMessageId = msgs[idx - 1]!.id
  readStateStore.readStates.set(props.channelId, previousMessageId)
  // Ensure latestMessageIds has the actual latest so unreadChannels reacts
  const latest = msgs[msgs.length - 1]
  if (latest) {
    readStateStore.latestMessageIds.set(props.channelId, latest.id)
  }
}
const containerRef = ref<HTMLElement | null>(null)
const scrollEnabled = ref(false)
const showJumpButton = ref(false)
const dividerMessageId = ref<string | null>(null)

function handleScroll() {
  if (!containerRef.value) return
  const el = containerRef.value
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight

  // Don't update button visibility while loading more messages to prevent flicker
  if (!isLoadingMore.value) {
    showJumpButton.value = distanceFromBottom > 300
  }

  if (distanceFromBottom < 100) {
    dividerMessageId.value = null
  }
}

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
    showJumpButton.value = false
    // Capture last read message before marking as read
    const lastRead = readStateStore.readStates.get(id)
    const latest = readStateStore.latestMessageIds.get(id)
    await messagesStore.fetchMessages(id)
    // Set divider if there are unread messages
    if (lastRead && latest && lastRead !== latest) {
      dividerMessageId.value = lastRead
    } else {
      dividerMessageId.value = null
    }
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
  showJumpButton.value = false
}

function scrollToMessage(messageId: string) {
  if (!containerRef.value) return
  const el = containerRef.value.querySelector(`[data-message-id="${messageId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('bg-primary/10')
    setTimeout(() => el.classList.remove('bg-primary/10'), 2000)
  } else {
    // Message not in current view - show toast notification
    import('vue-sonner').then(({ toast }) => {
      toast.info('Message not in current view', {
        description: 'Try scrolling up to load older messages'
      })
    })
  }
}

defineExpose({ scrollToMessage })
</script>

<template>
  <div ref="containerRef" class="relative flex-1 overflow-y-auto" @scroll="handleScroll">
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

      <template v-for="(message, index) in messages" :key="message.id">
        <MessageItem
          :message="message"
          :show-author="index === 0 || messages[index - 1]?.author.id !== message.author.id || !!message.replyTo"
          :current-user-id="authStore.user?.id"
          :can-delete="isServerOwner"
          @edit="handleEdit"
          @delete="handleDelete"
          @pin="handlePin"
          @unpin="handleUnpin"
          @reaction="handleReaction"
          @reply="handleReply"
          @jump-to="handleJumpTo"
          @mark-unread="handleMarkUnread"
        />
        <!-- New Messages divider -->
        <div
          v-if="message.id === dividerMessageId && index < messages.length - 1"
          class="flex items-center gap-2 px-4 py-1"
        >
          <div class="flex-1 border-t border-red-500" />
          <span class="text-xs font-semibold text-red-500">New Messages</span>
          <div class="flex-1 border-t border-red-500" />
        </div>
      </template>

      <!-- Bottom padding so last message isn't flush against input -->
      <div class="h-4" />
    </div>

    <!-- Jump to Latest button -->
    <button
      v-if="showJumpButton"
      @click="scrollToBottom"
      class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
    >
      <ArrowDown class="size-4" />
      Jump to Latest
    </button>
  </div>
</template>
