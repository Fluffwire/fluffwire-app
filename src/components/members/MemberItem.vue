<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { MemberWithUser } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { serverApi } from '@/services/serverApi'
import UserAvatar from '@/components/common/UserAvatar.vue'
import UserProfilePopover from '@/components/common/UserProfilePopover.vue'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserX, Ban, MessageSquare, Copy, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'

interface Props {
  member: MemberWithUser
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const presenceStore = usePresenceStore()
const serversStore = useServersStore()
const authStore = useAuthStore()
const dmStore = useDirectMessagesStore()

const serverId = computed(() => route.params.serverId as string)
const isOwner = computed(() => serversStore.currentServer?.ownerId === authStore.user?.id)
const isSelf = computed(() => props.member.userId === authStore.user?.id)

const showKickDialog = ref(false)
const showBanDialog = ref(false)

async function handleKick() {
  try {
    await serverApi.kickMember(serverId.value, props.member.userId)
    toast.success(`Kicked ${props.member.user?.displayName}`)
  } catch {
    toast.error('Failed to kick member')
  }
  showKickDialog.value = false
}

async function handleBan() {
  try {
    await serverApi.banMember(serverId.value, props.member.userId)
    toast.success(`Banned ${props.member.user?.displayName}`)
  } catch {
    toast.error('Failed to ban member')
  }
  showBanDialog.value = false
}

async function openDM() {
  const dm = await dmStore.openDM(props.member.userId)
  router.push(`/channels/@me/${dm.id}`)
}

function copyUserId() {
  navigator.clipboard.writeText(props.member.userId)
  toast.success('User ID copied')
}

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
  <ContextMenu>
    <ContextMenuTrigger as="div">
      <UserProfilePopover :user="profileUser" side="left" disable-context-menu>
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
    </ContextMenuTrigger>

    <ContextMenuContent class="w-48">
      <ContextMenuItem v-if="!isSelf" class="gap-2" @click="openDM">
        <MessageSquare class="h-4 w-4" />
        Message
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @click="copyUserId">
        <Copy class="h-4 w-4" />
        Copy User ID
      </ContextMenuItem>
      <template v-if="isOwner && !isSelf">
        <ContextMenuSeparator />
        <ContextMenuItem class="gap-2 text-destructive" @click="showKickDialog = true">
          <UserX class="h-4 w-4" />
          Kick
        </ContextMenuItem>
        <ContextMenuItem class="gap-2 text-destructive" @click="showBanDialog = true">
          <Ban class="h-4 w-4" />
          Ban
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>

  <!-- Kick confirmation -->
  <AlertDialog :open="showKickDialog" @update:open="showKickDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Kick {{ member.user?.displayName }}?</AlertDialogTitle>
        <AlertDialogDescription>
          They will be removed from the server but can rejoin with an invite.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleKick">
          Kick
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Ban confirmation -->
  <AlertDialog :open="showBanDialog" @update:open="showBanDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Ban {{ member.user?.displayName }}?</AlertDialogTitle>
        <AlertDialogDescription>
          They will be removed from the server and cannot rejoin.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleBan">
          Ban
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
