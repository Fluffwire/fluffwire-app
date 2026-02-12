<script setup lang="ts">
import type { MemberWithUser } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  member: MemberWithUser
}

const props = defineProps<Props>()
const presenceStore = usePresenceStore()
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50">
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
      </TooltipTrigger>
      <TooltipContent side="left">
        {{ member.user?.username ?? member.nickname ?? 'Unknown' }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
