<script setup lang="ts">
import { ref } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { Button } from '@/components/ui/button'
import { SendHorizontal } from 'lucide-vue-next'

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
    <div class="flex items-end rounded-xl border border-input bg-card">
      <textarea
        v-model="content"
        @keydown="handleKeydown"
        :placeholder="`Message #${channelName}`"
        rows="1"
        class="max-h-[50vh] min-h-[44px] flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none"
      />
      <Button
        v-if="content.trim()"
        variant="ghost"
        size="icon"
        class="mb-1 mr-1 h-8 w-8 text-primary hover:text-primary"
        @click="handleSubmit"
      >
        <SendHorizontal class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
