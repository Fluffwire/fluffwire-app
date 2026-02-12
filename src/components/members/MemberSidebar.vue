<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMembersStore } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import MemberItem from './MemberItem.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface Props {
  isSheet?: boolean
}

withDefaults(defineProps<Props>(), { isSheet: false })

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
  <aside
    :class="[
      'flex h-full flex-col bg-card border-l border-border/50',
      isSheet ? 'w-full' : 'w-60 shrink-0',
    ]"
  >
    <ScrollArea class="flex-1">
      <div class="p-4">
        <div v-if="onlineMembers.length" class="mb-4">
          <h3 class="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Online
            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ onlineMembers.length }}</Badge>
          </h3>
          <MemberItem
            v-for="member in onlineMembers"
            :key="member.userId"
            :member="member"
          />
        </div>

        <div v-if="offlineMembers.length">
          <h3 class="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Offline
            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ offlineMembers.length }}</Badge>
          </h3>
          <MemberItem
            v-for="member in offlineMembers"
            :key="member.userId"
            :member="member"
          />
        </div>
      </div>
    </ScrollArea>
  </aside>
</template>
