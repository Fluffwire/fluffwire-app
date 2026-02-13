<script setup lang="ts">
import { computed } from 'vue'
import type { Friend } from '@/types'
import { useRouter } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useFriendsStore } from '@/stores/friends'
import { usePresenceStore } from '@/stores/presence'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MessageSquare, X } from 'lucide-vue-next'

interface Props {
  friend: Friend
}

const props = defineProps<Props>()
const router = useRouter()
const dmStore = useDirectMessagesStore()
const friendsStore = useFriendsStore()
const presenceStore = usePresenceStore()

const status = computed(() => presenceStore.getStatus(props.friend.user.id))

async function openDM() {
  const dm = await dmStore.openDM(props.friend.user.id)
  router.push(`/channels/@me/${dm.id}`)
}
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50">
    <UserAvatar
      :src="friend.user.avatar"
      :alt="friend.user.displayName"
      size="sm"
      :status="status"
    />

    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-foreground">{{ friend.user.displayName }}</div>
      <div class="text-xs capitalize text-muted-foreground">{{ status === 'offline' ? 'Offline' : status === 'dnd' ? 'Do Not Disturb' : status }}</div>
    </div>

    <TooltipProvider>
      <div class="flex gap-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="openDM">
              <MessageSquare class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Message</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8 hover:text-destructive" @click="friendsStore.removeFriend(friend.id)">
              <X class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove Friend</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  </div>
</template>
