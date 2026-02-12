<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import MessageItem from './MessageItem.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

interface Props {
  channelId: string
}

const props = defineProps<Props>()
const messagesStore = useMessagesStore()
const containerRef = ref<HTMLElement | null>(null)

const messages = computed(() => messagesStore.getMessages(props.channelId))
const hasMore = computed(() => messagesStore.channelHasMore(props.channelId))

async function loadMore() {
  if (!hasMore.value) return
  await messagesStore.fetchMessages(props.channelId, true)
}

const { isLoadingMore } = useInfiniteScroll(containerRef, loadMore, { direction: 'top' })

watch(() => props.channelId, async (id) => {
  if (id) {
    await messagesStore.fetchMessages(id)
    await nextTick()
    scrollToBottom()
  }
}, { immediate: true })

// Auto-scroll on new messages
watch(() => messages.value.length, async () => {
  await nextTick()
  if (containerRef.value) {
    const el = containerRef.value
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (isNearBottom) scrollToBottom()
  }
})

function scrollToBottom() {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
}
</script>

<template>
  <div ref="containerRef" class="flex-1 overflow-y-auto">
    <div class="flex min-h-full flex-col justify-end">
      <div v-if="isLoadingMore" class="py-4">
        <LoadingSpinner size="sm" />
      </div>

      <div v-if="messages.length === 0 && !messagesStore.isLoading" class="p-8 text-center">
        <h3 class="text-xl font-bold text-text-primary">Welcome to #{{ channelId }}!</h3>
        <p class="mt-1 text-text-secondary">This is the start of the conversation.</p>
      </div>

      <MessageItem
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :show-author="index === 0 || messages[index - 1]?.author.id !== message.author.id"
      />
    </div>
  </div>
</template>
