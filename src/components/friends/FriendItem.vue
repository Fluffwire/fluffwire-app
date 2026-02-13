<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Friend } from '@/types'
import { useRouter } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useFriendsStore } from '@/stores/friends'
import { usePresenceStore } from '@/stores/presence'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MessageSquare, X } from 'lucide-vue-next'

const showRemoveDialog = ref(false)

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
  <div class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50" @click="openDM">
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
      <div class="flex gap-1" @click.stop>
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
            <Button variant="ghost" size="icon" class="h-8 w-8 hover:text-destructive" @click="showRemoveDialog = true">
              <X class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove Friend</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>

    <!-- Remove friend confirmation -->
    <AlertDialog :open="showRemoveDialog" @update:open="showRemoveDialog = $event">
      <AlertDialogContent @click.stop>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {{ friend.user.displayName }}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this friend? You will need to send a new friend request to add them back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="friendsStore.removeFriend(friend.id)">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
