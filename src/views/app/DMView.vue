<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import ChatArea from '@/components/chat/ChatArea.vue'

const route = useRoute()
const dmStore = useDirectMessagesStore()

const dmId = computed(() => route.params.dmId as string)

watch(dmId, (id) => {
  dmStore.currentDmId = id
}, { immediate: true })

const dm = computed(() => dmStore.currentDm)
</script>

<template>
  <ChatArea
    v-if="dm"
    :channel-id="dm.id"
    :channel-name="dm.recipient.displayName"
    :is-dm="true"
  />
  <div v-else class="flex h-full items-center justify-center text-text-secondary">
    Select a conversation
  </div>
</template>
