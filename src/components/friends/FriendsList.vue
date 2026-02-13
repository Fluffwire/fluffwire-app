<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends'
import FriendItem from './FriendItem.vue'
import FriendRequestItem from './FriendRequestItem.vue'

interface Props {
  tab: 'online' | 'all' | 'pending'
}

const props = defineProps<Props>()
const { t } = useI18n()
const friendsStore = useFriendsStore()

const filteredFriends = computed(() => {
  if (props.tab === 'online') return friendsStore.onlineFriends
  if (props.tab === 'all') return friendsStore.friends
  return []
})

const label = computed(() => {
  if (props.tab === 'pending') return `${t('friends.pending')} — ${friendsStore.pendingRequests.length}`
  return `${props.tab === 'online' ? t('friends.online') : t('friends.all')} — ${filteredFriends.value.length}`
})
</script>

<template>
  <div>
    <h4 class="mb-2 text-xs font-semibold uppercase text-muted-foreground">{{ label }}</h4>

    <template v-if="tab === 'pending'">
      <FriendRequestItem
        v-for="request in friendsStore.pendingRequests"
        :key="request.id"
        :request="request"
      />
      <p v-if="friendsStore.pendingRequests.length === 0" class="py-8 text-center text-sm text-muted-foreground">
        {{ $t('friends.noPending') }}
      </p>
    </template>

    <template v-else>
      <FriendItem
        v-for="friend in filteredFriends"
        :key="friend.id"
        :friend="friend"
      />
      <p v-if="filteredFriends.length === 0" class="py-8 text-center text-sm text-muted-foreground">
        {{ tab === 'online' ? $t('friends.noOnline') : $t('friends.noFriends') }}
      </p>
    </template>
  </div>
</template>
