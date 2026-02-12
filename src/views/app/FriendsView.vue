<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFriendsStore } from '@/stores/friends'
import FriendsList from '@/components/friends/FriendsList.vue'
import AddFriendForm from '@/components/friends/AddFriendForm.vue'

const friendsStore = useFriendsStore()

type Tab = 'online' | 'all' | 'pending' | 'add'
const activeTab = ref<Tab>('online')

const tabs: { key: Tab; label: string }[] = [
  { key: 'online', label: 'Online' },
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'add', label: 'Add Friend' },
]

onMounted(() => {
  friendsStore.fetchFriends()
  friendsStore.fetchRequests()
})

const pendingCount = computed(() => friendsStore.pendingRequests.length)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex h-12 items-center gap-4 border-b border-border/50 px-4 shadow-sm">
      <svg class="h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
      <h3 class="font-semibold text-text-primary">Friends</h3>

      <div class="ml-4 flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'relative rounded px-2 py-1 text-sm font-medium transition-colors',
            activeTab === tab.key
              ? tab.key === 'add' ? 'bg-online text-white' : 'bg-active-bg text-text-primary'
              : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
          ]"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'pending' && pendingCount > 0"
            class="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-xs text-white"
          >
            {{ pendingCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <AddFriendForm v-if="activeTab === 'add'" />
      <FriendsList v-else :tab="activeTab" />
    </div>
  </div>
</template>
