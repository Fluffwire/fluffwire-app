<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useReadStateStore } from '@/stores/readState'
import UserAvatar from '@/components/common/UserAvatar.vue'

const router = useRouter()
const route = useRoute()
const dmStore = useDirectMessagesStore()
const readStateStore = useReadStateStore()

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
        'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
        route.params.dmId === dm.id
          ? 'border-l-2 border-primary bg-accent text-foreground'
          : readStateStore.isUnread(dm.id)
            ? 'font-semibold text-foreground hover:bg-accent/50'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      ]"
    >
      <UserAvatar
        :src="dm.recipient.avatar"
        :alt="dm.recipient.displayName"
        size="sm"
        :status="dm.recipient.status"
      />
      <div class="min-w-0 flex-1 text-left">
        <div class="truncate text-sm font-medium">{{ dm.recipient.displayName }}</div>
        <div v-if="dm.lastMessage" class="truncate text-xs text-muted-foreground">
          {{ dm.lastMessage.content }}
        </div>
      </div>
      <span v-if="readStateStore.isUnread(dm.id) && route.params.dmId !== dm.id" class="h-2 w-2 shrink-0 rounded-full bg-primary" />
    </button>

    <p v-if="dmStore.dmChannels.length === 0" class="px-2 py-4 text-center text-xs text-muted-foreground">
      No direct messages yet
    </p>
  </div>
</template>
