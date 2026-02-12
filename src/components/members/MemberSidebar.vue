<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMembersStore } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import MemberItem from './MemberItem.vue'

const route = useRoute()
const membersStore = useMembersStore()
const presenceStore = usePresenceStore()

const serverId = computed(() => route.params.serverId as string)

watch(serverId, (id) => {
  if (id && id !== '@me') {
    membersStore.fetchMembers(id)
  }
}, { immediate: true })

const members = computed(() => membersStore.getMembers(serverId.value))

const onlineMembers = computed(() =>
  members.value.filter((m) => presenceStore.getStatus(m.userId) !== 'offline')
)

const offlineMembers = computed(() =>
  members.value.filter((m) => presenceStore.getStatus(m.userId) === 'offline')
)
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col overflow-y-auto bg-channel-bg">
    <div class="p-4">
      <div v-if="onlineMembers.length" class="mb-4">
        <h3 class="mb-2 px-2 text-xs font-semibold uppercase text-text-secondary">
          Online — {{ onlineMembers.length }}
        </h3>
        <MemberItem
          v-for="member in onlineMembers"
          :key="member.userId"
          :member="member"
        />
      </div>

      <div v-if="offlineMembers.length">
        <h3 class="mb-2 px-2 text-xs font-semibold uppercase text-text-secondary">
          Offline — {{ offlineMembers.length }}
        </h3>
        <MemberItem
          v-for="member in offlineMembers"
          :key="member.userId"
          :member="member"
        />
      </div>
    </div>
  </aside>
</template>
