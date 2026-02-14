<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Sortable from 'sortablejs'
import { isTauri } from '@/utils/platform'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useReadStateStore } from '@/stores/readState'
import { useAuthStore } from '@/stores/auth'
import { useNotificationSettingsStore } from '@/stores/notificationSettings'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import ServerIcon from './ServerIcon.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, UserPlus, Settings, Hash, FolderPlus, Copy, LogOut, BellOff, Bell } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Server } from '@/types'

interface Props {
  isSheet?: boolean
}

withDefaults(defineProps<Props>(), { isSheet: false })

const { t } = useI18n()
const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const readStateStore = useReadStateStore()
const authStore = useAuthStore()
const notifSettings = useNotificationSettingsStore()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const showLeaveDialog = ref(false)
const leaveTarget = ref<Server | null>(null)
const sortableContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  if (sortableContainer.value) {
    Sortable.create(sortableContainer.value, {
      animation: 150,
      ghostClass: 'opacity-50',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      forceFallback: isTauri,
      onEnd() {
        if (!sortableContainer.value) return
        const ids: string[] = []
        sortableContainer.value.querySelectorAll('[data-server-id]').forEach((el) => {
          const id = (el as HTMLElement).dataset.serverId
          if (id) ids.push(id)
        })
        serversStore.saveServerOrderAndSync(ids)
      },
    })
  }
})

function isActive(serverId: string) {
  return route.params.serverId === serverId
}

function isOwner(server: Server) {
  return server.ownerId === authStore.user?.id
}

function navigateHome() {
  router.push('/channels/@me')
  if (uiStore.isMobileView) uiStore.isMobileSidebarOpen = false
}

async function navigateToServer(serverId: string) {
  await channelsStore.fetchChannels(serverId)
  const firstChannel = channelsStore.textChannels[0]
  router.push(`/channels/${serverId}/${firstChannel?.id ?? ''}`)
  // Don't close drawer - let user select channel first
}

function handleInvite(server: Server) {
  uiStore.openModal('invite', server.id)
}

function handleServerSettings(server: Server) {
  uiStore.openModal('serverSettings', server)
}

function handleCreateChannel(server: Server) {
  // Navigate to server first, then open create channel modal
  navigateToServer(server.id)
  uiStore.openModal('createChannel')
}

function handleCreateCategory(server: Server) {
  navigateToServer(server.id)
  uiStore.openModal('createCategory')
}

function handleCopyId(serverId: string) {
  navigator.clipboard.writeText(serverId)
  toast.success(t('server.serverIdCopied'))
}

function handleToggleMute(serverId: string) {
  notifSettings.toggleMute(serverId)
  toast.success(notifSettings.isMuted(serverId) ? t('server.serverMuted') : t('server.serverUnmuted'))
}

function handleLeaveServer(server: Server) {
  leaveTarget.value = server
  showLeaveDialog.value = true
}

async function confirmLeave() {
  if (!leaveTarget.value) return
  try {
    await serversStore.leaveServer(leaveTarget.value.id)
    toast.success(`Left ${leaveTarget.value.name}`)
    router.push('/channels/@me')
  } catch {
    toast.error(t('server.failedLeave'))
  } finally {
    showLeaveDialog.value = false
    leaveTarget.value = null
  }
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <nav
      :class="[
        'flex h-full flex-col items-center gap-1.5 overflow-y-auto bg-gradient-to-b from-sidebar to-background py-2',
        isSheet ? 'w-[72px]' : 'w-[72px]'
      ]"
    >
      <!-- Home button -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            @click="navigateHome"
            :class="[
              'group flex h-12 w-12 items-center justify-center transition-all duration-200 ring-1 ring-primary/20',
              route.path.startsWith('/channels/@me')
                ? 'rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'rounded-[28px] bg-secondary text-foreground hover:rounded-2xl hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/15',
            ]"
          >
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.53 4.306v15.363c0 .988-.544 1.896-1.414 2.363l-7.7 4.139a2.74 2.74 0 01-2.632.039l-7.7-4.139A2.72 2.72 0 01.67 19.669V4.306C.67 3.32 1.214 2.41 2.084 1.944L9.784.166a2.74 2.74 0 012.632-.039l7.7 1.778a2.72 2.72 0 011.414 2.401z" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Home</TooltipContent>
      </Tooltip>

      <Separator class="mx-auto w-7" />

      <!-- Server icons (drag-to-reorder) -->
      <ScrollArea class="flex-1">
        <div ref="sortableContainer" class="flex flex-col items-center gap-2 pb-2">
          <div v-for="server in serversStore.orderedServers" :key="server.id" :data-server-id="server.id">
            <ContextMenu>
              <Tooltip>
                <ContextMenuTrigger as-child>
                  <TooltipTrigger as-child>
                    <div class="relative">
                      <ServerIcon
                        :server="server"
                        :active="isActive(server.id)"
                        @click="navigateToServer(server.id)"
                      />
                      <span
                        v-if="!isActive(server.id) && readStateStore.hasUnreadInServer(server.id)"
                        class="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
                      />
                    </div>
                  </TooltipTrigger>
                </ContextMenuTrigger>
                <TooltipContent side="right">{{ server.name }}</TooltipContent>
              </Tooltip>

              <ContextMenuContent class="w-52">
                <ContextMenuItem @click="handleInvite(server)" class="gap-2">
                  <UserPlus class="h-4 w-4" />
                  {{ $t('server.inviteModal') }}
                </ContextMenuItem>
                <template v-if="isOwner(server)">
                  <ContextMenuItem @click="handleServerSettings(server)" class="gap-2">
                    <Settings class="h-4 w-4" />
                    {{ $t('server.serverSettings') }}
                  </ContextMenuItem>
                  <ContextMenuItem @click="handleCreateChannel(server)" class="gap-2">
                    <Hash class="h-4 w-4" />
                    {{ $t('channel.createChannel') }}
                  </ContextMenuItem>
                  <ContextMenuItem @click="handleCreateCategory(server)" class="gap-2">
                    <FolderPlus class="h-4 w-4" />
                    {{ $t('channel.createCategory') }}
                  </ContextMenuItem>
                </template>
                <ContextMenuSeparator />
                <ContextMenuItem @click="handleToggleMute(server.id)" class="gap-2">
                  <BellOff v-if="!notifSettings.isMuted(server.id)" class="h-4 w-4" />
                  <Bell v-else class="h-4 w-4" />
                  {{ notifSettings.isMuted(server.id) ? $t('server.unmuteServer') : $t('server.muteServer') }}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem @click="handleCopyId(server.id)" class="gap-2">
                  <Copy class="h-4 w-4" />
                  {{ $t('server.copyServerId') }}
                </ContextMenuItem>
                <template v-if="!isOwner(server)">
                  <ContextMenuSeparator />
                  <ContextMenuItem @click="handleLeaveServer(server)" class="gap-2 text-destructive focus:text-destructive">
                    <LogOut class="h-4 w-4" />
                    {{ $t('server.leaveServer') }}
                  </ContextMenuItem>
                </template>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>
      </ScrollArea>

      <!-- Add server button -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            @click="uiStore.openModal('createServer')"
            class="flex h-12 w-12 items-center justify-center rounded-[24px] border-2 border-dashed border-primary/40 text-primary transition-all duration-200 hover:rounded-2xl hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/15"
          >
            <Plus class="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Add a Server</TooltipContent>
      </Tooltip>
    </nav>
  </TooltipProvider>

  <!-- Leave server confirmation -->
  <AlertDialog :open="showLeaveDialog" @update:open="showLeaveDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('server.leaveServer') }}</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to leave <strong>{{ leaveTarget?.name }}</strong>? You won't be able to rejoin unless you're re-invited.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="confirmLeave" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">{{ $t('server.leaveServer') }}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
