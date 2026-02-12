<script setup lang="ts">
import ChatHeader from './ChatHeader.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import TypingIndicator from './TypingIndicator.vue'

interface Props {
  channelId: string
  channelName: string
  isDm?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="flex h-full flex-col">
    <ChatHeader :channel-name="channelName" :is-dm="isDm" />
    <MessageList :channel-id="channelId" :channel-name="channelName" />
    <div class="relative px-4 pb-6">
      <MessageInput :channel-id="channelId" :channel-name="channelName" />
      <TypingIndicator :channel-id="channelId" />
    </div>
  </div>
</template>
