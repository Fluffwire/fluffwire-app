<script setup lang="ts">
import type { Friend } from '@/types'
import { useRouter } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useFriendsStore } from '@/stores/friends'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

interface Props {
  friend: Friend
}

const props = defineProps<Props>()
const router = useRouter()
const dmStore = useDirectMessagesStore()
const friendsStore = useFriendsStore()

async function openDM() {
  const dm = await dmStore.openDM(props.friend.user.id)
  router.push(`/channels/@me/${dm.id}`)
}
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-hover-bg">
    <BaseAvatar
      :src="friend.user.avatar"
      :alt="friend.user.displayName"
      size="sm"
      :status="friend.user.status"
    />

    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-text-primary">{{ friend.user.displayName }}</div>
      <div class="text-xs capitalize text-text-secondary">{{ friend.user.status }}</div>
    </div>

    <div class="flex gap-2">
      <button
        @click="openDM"
        class="rounded-full bg-chat-bg p-2 text-text-secondary transition-colors hover:text-text-primary"
        title="Message"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </button>
      <button
        @click="friendsStore.removeFriend(friend.id)"
        class="rounded-full bg-chat-bg p-2 text-text-secondary transition-colors hover:text-danger"
        title="Remove Friend"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
