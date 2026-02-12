<script setup lang="ts">
import { ref } from 'vue'
import { useMessagesStore } from '@/stores/messages'

interface Props {
  channelId: string
  channelName: string
}

const props = defineProps<Props>()
const messagesStore = useMessagesStore()

const content = ref('')

function handleSubmit() {
  const text = content.value.trim()
  if (!text) return
  messagesStore.sendMessage({ content: text, channelId: props.channelId })
  content.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="relative">
    <div class="flex items-center rounded-lg bg-input-bg">
      <textarea
        v-model="content"
        @keydown="handleKeydown"
        :placeholder="`Message #${channelName}`"
        rows="1"
        class="max-h-[50vh] min-h-[44px] flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none"
      />
    </div>
  </div>
</template>
