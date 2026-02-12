<script setup lang="ts">
import type { MemberWithUser } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

interface Props {
  member: MemberWithUser
}

const props = defineProps<Props>()
const presenceStore = usePresenceStore()
</script>

<template>
  <div class="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-hover-bg">
    <BaseAvatar
      :src="member.user?.avatar ?? null"
      :alt="member.nickname ?? member.user?.displayName ?? ''"
      size="sm"
      :status="presenceStore.getStatus(member.userId)"
    />
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium text-text-secondary">
        {{ member.nickname ?? member.user?.displayName ?? 'Unknown' }}
      </div>
    </div>
  </div>
</template>
