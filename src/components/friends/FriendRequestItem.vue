<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FriendRequest } from '@/types'
import { useFriendsStore } from '@/stores/friends'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, X } from 'lucide-vue-next'

interface Props {
  request: FriendRequest
}

const props = defineProps<Props>()
const { t } = useI18n()
const friendsStore = useFriendsStore()
const authStore = useAuthStore()

const isIncoming = props.request.to.id === authStore.user?.id
const user = isIncoming ? props.request.from : props.request.to
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50">
    <UserAvatar
      :src="user.avatar"
      :alt="user.displayName"
      size="sm"
    />

    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-foreground">{{ user.displayName }}</div>
      <div class="text-xs text-muted-foreground">
        {{ isIncoming ? $t('friends.incoming') : $t('friends.outgoing') }}
      </div>
    </div>

    <TooltipProvider v-if="isIncoming">
      <div class="flex gap-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8 hover:text-online" @click="friendsStore.acceptRequest(request.id)">
              <Check class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ $t('friends.accept') }}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8 hover:text-destructive" @click="friendsStore.rejectRequest(request.id)">
              <X class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ $t('friends.decline') }}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  </div>
</template>
