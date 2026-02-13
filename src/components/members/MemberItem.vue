<script setup lang="ts">
import { computed } from 'vue'
import type { MemberWithUser } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import UserAvatar from '@/components/common/UserAvatar.vue'
import UserProfilePopover from '@/components/common/UserProfilePopover.vue'

interface Props {
  member: MemberWithUser
}

const props = defineProps<Props>()
const presenceStore = usePresenceStore()

const profileUser = computed(() => ({
  id: props.member.userId,
  username: props.member.user?.username ?? 'Unknown',
  displayName: props.member.nickname ?? props.member.user?.displayName ?? 'Unknown',
  avatar: props.member.user?.avatar ?? null,
  bio: (props.member.user as { bio?: string })?.bio,
  createdAt: (props.member.user as { createdAt?: string })?.createdAt ?? '',
}))
</script>

<template>
  <UserProfilePopover :user="profileUser" side="left">
    <div class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50">
      <UserAvatar
        :src="member.user?.avatar ?? null"
        :alt="member.nickname ?? member.user?.displayName ?? ''"
        size="sm"
        :status="presenceStore.getStatus(member.userId)"
      />
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-muted-foreground">
          {{ member.nickname ?? member.user?.displayName ?? 'Unknown' }}
        </div>
      </div>
    </div>
  </UserProfilePopover>
</template>
