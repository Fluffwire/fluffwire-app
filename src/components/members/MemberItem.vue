<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { MemberWithUser } from '@/stores/members'
import { usePresenceStore } from '@/stores/presence'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { useLabelsStore } from '@/stores/labels'
import { useMembersStore } from '@/stores/members'
import { serverApi } from '@/services/serverApi'
import { TierLabelKeys, canManageLabels } from '@/constants/tiers'
import type { Tier } from '@/constants/tiers'
import UserAvatar from '@/components/common/UserAvatar.vue'
import UserProfilePopover from '@/components/common/UserProfilePopover.vue'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuCheckboxItem,
} from '@/components/ui/context-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserX, Ban, MessageSquare, Copy, User, Shield } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'

interface Props {
  member: MemberWithUser
}

const props = defineProps<Props>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const presenceStore = usePresenceStore()
const serversStore = useServersStore()
const authStore = useAuthStore()
const dmStore = useDirectMessagesStore()
const labelsStore = useLabelsStore()
const membersStore = useMembersStore()

const serverId = computed(() => route.params.serverId as string)
const currentMember = computed(() => {
  const members = membersStore.getMembers(serverId.value)
  return members.find(m => m.userId === authStore.user?.id)
})
const isOwner = computed(() => serversStore.currentServer?.ownerId === authStore.user?.id)
const isSelf = computed(() => props.member.userId === authStore.user?.id)
const canChangeTier = computed(() => {
  if (isSelf.value) return false // Can't change own tier
  if (props.member.tier === 'owner') return false // Can't change owner's tier
  if (isOwner.value) return true // Owner can change anyone's tier
  // Admin can change moderator/member tiers
  return currentMember.value?.tier === 'admin' && props.member.tier !== 'admin'
})

const showKickDialog = ref(false)
const showBanDialog = ref(false)

const availableLabels = computed(() => labelsStore.getLabels(serverId.value))
const canAssignLabels = computed(() => {
  const tier = currentMember.value?.tier
  return tier && canManageLabels(tier as Tier)
})

// Map to store computed refs for each label
const labelComputeds = new Map<string, ReturnType<typeof computed<boolean>>>()

// Create computed for each available label
watch(availableLabels, (labels) => {
  labels.forEach(label => {
    if (!labelComputeds.has(label.id)) {
      labelComputeds.set(label.id, computed({
        get: () => props.member.labels?.includes(label.id) ?? false,
        set: async (value: boolean) => {
          try {
            const currentLabels = props.member.labels || []
            const newLabels = value
              ? [...currentLabels, label.id]
              : currentLabels.filter(id => id !== label.id)

            await serverApi.assignMemberLabels(serverId.value, props.member.userId, newLabels)
            toast.success(t('members.labelsAssigned'))
          } catch {
            toast.error(t('members.failedAssignLabels'))
          }
        }
      }))
    }
  })
}, { immediate: true })

// Computed properties for tier checkboxes
const isAdmin = computed({
  get: () => props.member.tier === 'admin',
  set: () => handleChangeTier('admin')
})

const isModerator = computed({
  get: () => props.member.tier === 'moderator',
  set: () => handleChangeTier('moderator')
})

const isMemberTier = computed({
  get: () => props.member.tier === 'member',
  set: () => handleChangeTier('member')
})

async function handleChangeTier(tier: Tier) {
  try {
    await labelsStore.setMemberTier(serverId.value, props.member.userId, tier)
    toast.success(t('members.roleChanged'))
  } catch {
    toast.error(t('members.failedChangeRole'))
  }
}

async function handleKick() {
  try {
    await serverApi.kickMember(serverId.value, props.member.userId)
    toast.success(`Kicked ${props.member.user?.displayName}`)
  } catch {
    toast.error(t('members.failedKick'))
  }
  showKickDialog.value = false
}

async function handleBan() {
  try {
    await serverApi.banMember(serverId.value, props.member.userId)
    toast.success(`Banned ${props.member.user?.displayName}`)
  } catch {
    toast.error(t('members.failedBan'))
  }
  showBanDialog.value = false
}

async function openDM() {
  const dm = await dmStore.openDM(props.member.userId)
  router.push(`/channels/@me/${dm.id}`)
}

function copyUserId() {
  navigator.clipboard.writeText(props.member.userId)
  toast.success(t('members.userIdCopied'))
}

const memberLabel = computed(() => {
  if (!props.member.labels?.length) return null
  const serverLabels = labelsStore.getLabels(serverId.value)
  if (!serverLabels.length) return null
  // Find the highest positioned label (lowest position number)
  let bestLabel = null
  for (const labelId of props.member.labels) {
    const label = serverLabels.find(l => l.id === labelId)
    if (label && (bestLabel === null || label.position < bestLabel.position)) {
      bestLabel = label
    }
  }
  return bestLabel
})

const memberLabelColor = computed(() => memberLabel.value?.color)

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
            <div class="flex items-center gap-1.5">
              <div
                class="truncate text-sm font-medium"
                :class="memberLabelColor ? '' : 'text-muted-foreground'"
                :style="memberLabelColor ? { color: memberLabelColor } : undefined"
              >
                {{ member.nickname ?? member.user?.displayName ?? 'Unknown' }}
              </div>
              <div
                v-if="memberLabel"
                class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                :style="{ backgroundColor: memberLabel.color || '#888', color: '#fff' }"
              >
                {{ memberLabel.name }}
              </div>
            </div>
          </div>
        </div>
      </UserProfilePopover>
    </ContextMenuTrigger>

    <ContextMenuContent class="w-48">
      <ContextMenuItem v-if="!isSelf" class="gap-2" @click="openDM">
        <MessageSquare class="h-4 w-4" />
        {{ $t('friends.message') }}
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @click="copyUserId">
        <Copy class="h-4 w-4" />
        {{ $t('members.copyUserId') }}
      </ContextMenuItem>
      <template v-if="canChangeTier || canAssignLabels">
        <ContextMenuSeparator />

        <!-- Change Role Submenu -->
        <ContextMenuSub v-if="canChangeTier">
          <ContextMenuSubTrigger>
            <Shield class="mr-2 h-4 w-4" />
            {{ $t('members.changeRole') }}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuCheckboxItem v-if="isOwner" v-model="isAdmin">
              {{ $t('members.admin') }}
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem v-model="isModerator">
              {{ $t('members.moderator') }}
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem v-model="isMemberTier">
              {{ $t('members.member') }}
            </ContextMenuCheckboxItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <!-- Assign Labels Submenu -->
        <ContextMenuSub v-if="canAssignLabels">
          <ContextMenuSubTrigger>
            <User class="mr-2 h-4 w-4" />
            {{ $t('members.assignLabels') }}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuCheckboxItem
              v-for="label in availableLabels.filter(l => !l.isEveryone)"
              :key="label.id"
              v-model="labelComputeds.get(label.id)!.value"
            >
              <div class="flex items-center gap-2">
                <div
                  class="h-2.5 w-2.5 rounded-full"
                  :style="{ backgroundColor: label.color || '#99aab5' }"
                />
                <span>{{ label.name }}</span>
              </div>
            </ContextMenuCheckboxItem>
            <ContextMenuItem v-if="availableLabels.filter(l => !l.isEveryone).length === 0" disabled>
              {{ $t('server.noLabels') }}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </template>
      <template v-if="isOwner && !isSelf">
        <ContextMenuSeparator />
        <ContextMenuItem class="gap-2 text-destructive" @click="showKickDialog = true">
          <UserX class="h-4 w-4" />
          {{ $t('members.kickMember') }}
        </ContextMenuItem>
        <ContextMenuItem class="gap-2 text-destructive" @click="showBanDialog = true">
          <Ban class="h-4 w-4" />
          {{ $t('members.banMember') }}
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
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleKick">
          {{ $t('members.kickMember') }}
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
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleBan">
          {{ $t('members.banMember') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

</template>
