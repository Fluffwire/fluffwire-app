<script setup lang="ts">
import type { FriendRequest } from '@/types'
import { useFriendsStore } from '@/stores/friends'
import { useAuthStore } from '@/stores/auth'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

interface Props {
  request: FriendRequest
}

const props = defineProps<Props>()
const friendsStore = useFriendsStore()
const authStore = useAuthStore()

const isIncoming = props.request.to.id === authStore.user?.id
const user = isIncoming ? props.request.from : props.request.to
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-hover-bg">
    <BaseAvatar
      :src="user.avatar"
      :alt="user.displayName"
      size="sm"
    />

    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-text-primary">{{ user.displayName }}</div>
      <div class="text-xs text-text-secondary">
        {{ isIncoming ? 'Incoming Friend Request' : 'Outgoing Friend Request' }}
      </div>
    </div>

    <div v-if="isIncoming" class="flex gap-2">
      <button
        @click="friendsStore.acceptRequest(request.id)"
        class="rounded-full bg-chat-bg p-2 text-text-secondary transition-colors hover:text-online"
        title="Accept"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        @click="friendsStore.rejectRequest(request.id)"
        class="rounded-full bg-chat-bg p-2 text-text-secondary transition-colors hover:text-danger"
        title="Reject"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
