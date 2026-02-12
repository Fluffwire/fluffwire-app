<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

const router = useRouter()
const route = useRoute()
const dmStore = useDirectMessagesStore()

onMounted(() => {
  dmStore.fetchDMChannels()
})
</script>

<template>
  <div class="space-y-0.5">
    <button
      v-for="dm in dmStore.dmChannels"
      :key="dm.id"
      @click="router.push(`/channels/@me/${dm.id}`)"
      :class="[
        'flex w-full items-center gap-3 rounded px-2 py-1.5 transition-colors',
        route.params.dmId === dm.id
          ? 'bg-active-bg text-text-primary'
          : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
      ]"
    >
      <BaseAvatar
        :src="dm.recipient.avatar"
        :alt="dm.recipient.displayName"
        size="sm"
        :status="dm.recipient.status"
      />
      <div class="min-w-0 flex-1 text-left">
        <div class="truncate text-sm font-medium">{{ dm.recipient.displayName }}</div>
        <div v-if="dm.lastMessage" class="truncate text-xs text-text-muted">
          {{ dm.lastMessage.content }}
        </div>
      </div>
    </button>

    <p v-if="dmStore.dmChannels.length === 0" class="px-2 py-4 text-center text-xs text-text-muted">
      No direct messages yet
    </p>
  </div>
</template>
