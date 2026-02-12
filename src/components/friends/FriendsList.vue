<script setup lang="ts">
import { computed } from 'vue'
import { useFriendsStore } from '@/stores/friends'
import FriendItem from './FriendItem.vue'
import FriendRequestItem from './FriendRequestItem.vue'

interface Props {
  tab: 'online' | 'all' | 'pending'
}

const props = defineProps<Props>()
const friendsStore = useFriendsStore()

const filteredFriends = computed(() => {
  if (props.tab === 'online') return friendsStore.onlineFriends
  if (props.tab === 'all') return friendsStore.friends
  return []
})

const label = computed(() => {
  if (props.tab === 'pending') return `Pending — ${friendsStore.pendingRequests.length}`
  return `${props.tab === 'online' ? 'Online' : 'All Friends'} — ${filteredFriends.value.length}`
})
</script>

<template>
  <div>
    <h4 class="mb-2 text-xs font-semibold uppercase text-text-secondary">{{ label }}</h4>

    <template v-if="tab === 'pending'">
      <FriendRequestItem
        v-for="request in friendsStore.pendingRequests"
        :key="request.id"
        :request="request"
      />
      <p v-if="friendsStore.pendingRequests.length === 0" class="py-8 text-center text-sm text-text-secondary">
        No pending requests
      </p>
    </template>

    <template v-else>
      <FriendItem
        v-for="friend in filteredFriends"
        :key="friend.id"
        :friend="friend"
      />
      <p v-if="filteredFriends.length === 0" class="py-8 text-center text-sm text-text-secondary">
        {{ tab === 'online' ? 'No friends are online right now' : 'No friends yet' }}
      </p>
    </template>
  </div>
</template>
