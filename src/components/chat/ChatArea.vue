<script setup lang="ts">
import { ref } from 'vue'
import ChatHeader from './ChatHeader.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import TypingIndicator from './TypingIndicator.vue'
import PinnedMessagesPanel from './PinnedMessagesPanel.vue'
import SearchModal from './SearchModal.vue'

interface Props {
  channelId: string
  channelName: string
  isDm?: boolean
  isServerOwner?: boolean
}

defineProps<Props>()

const showPins = ref(false)
const showSearch = ref(false)

function togglePins() {
  showPins.value = !showPins.value
}
</script>

<template>
  <div class="flex h-full">
    <div class="flex h-full min-w-0 flex-1 flex-col">
      <ChatHeader
        :channel-name="channelName"
        :is-dm="isDm"
        @toggle-pins="togglePins"
        @open-search="showSearch = true"
      />
      <MessageList :channel-id="channelId" :channel-name="channelName" :is-server-owner="isServerOwner" />
      <div class="relative px-4 pb-6">
        <MessageInput :channel-id="channelId" :channel-name="channelName" />
        <TypingIndicator :channel-id="channelId" />
      </div>
    </div>

    <PinnedMessagesPanel
      :channel-id="channelId"
      :open="showPins"
      @close="showPins = false"
    />

    <SearchModal
      :channel-id="channelId"
      :open="showSearch"
      @update:open="showSearch = $event"
    />
  </div>
</template>
