<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Channel } from '@/types'
import { useVoiceStore } from '@/stores/voice'
import { useUiStore } from '@/stores/ui'
import { useChannelsStore } from '@/stores/channels'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { useReadStateStore } from '@/stores/readState'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Hash, Headphones, Pencil, Trash2, Mic, MicOff, Monitor } from 'lucide-vue-next'
import { isTauri } from '@/utils/platform'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { toast } from 'vue-sonner'

interface Props {
  channel: Channel
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const voiceStore = useVoiceStore()
const uiStore = useUiStore()
const channelsStore = useChannelsStore()
const serversStore = useServersStore()
const authStore = useAuthStore()
const readStateStore = useReadStateStore()

const showDeleteDialog = ref(false)
const showSwitchDialog = ref(false)

const isActive = computed(() => route.params.channelId === props.channel.id)
const hasUnread = computed(() => !isActive.value && props.channel.type === 'text' && readStateStore.isUnread(props.channel.id))

const isOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)

const voiceMembers = computed(() => voiceStore.getVoiceChannelMembers(props.channel.id))

function handleClick() {
  if (props.channel.type === 'voice' && voiceStore.currentChannelId && voiceStore.currentChannelId !== props.channel.id) {
    showSwitchDialog.value = true
    return
  }
  navigateToChannel()
}

async function navigateToChannel() {
  router.push(`/channels/${props.channel.serverId}/${props.channel.id}`)
  if (props.channel.type === 'voice' && voiceStore.currentChannelId !== props.channel.id) {
    try {
      await voiceStore.joinChannel(props.channel.serverId, props.channel.id)
    } catch (error) {
      console.error('[ChannelItem] Failed to join voice channel:', error)

      // Desktop-specific error message (known Tauri webkit bug)
      if (isTauri()) {
        toast.error(t('voice.desktopPermissionError'), {
          description: t('voice.desktopPermissionErrorDesc'),
          duration: 8000,
        })
      } else {
        toast.error(t('voice.joinError'))
      }
    }
  }
  if (uiStore.isMobileView || uiStore.isTabletView) {
    uiStore.isChannelSidebarOpen = false
  }
}

function confirmSwitch() {
  showSwitchDialog.value = false
  navigateToChannel()
}

function handleEdit() {
  uiStore.openModal('editChannel', props.channel)
}

async function handleDelete() {
  try {
    await channelsStore.deleteChannel(props.channel.id)
    toast.success(t('channel.channelDeleted'))
    showDeleteDialog.value = false
  } catch {
    toast.error(t('channel.failedDeleteChannel'))
  }
}
</script>

<template>
  <!-- Outer div is the draggable surface — no pointer-intercepting wrappers -->
  <div>
    <ContextMenu>
      <ContextMenuTrigger as="div">
        <button
          @click="handleClick"
          :class="[
            'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
            isActive
              ? 'border-l-2 border-primary bg-accent text-foreground'
              : hasUnread
                ? 'font-semibold text-foreground hover:bg-accent/50'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          ]"
        >
          <Hash v-if="channel.type === 'text'" class="h-5 w-5 shrink-0 opacity-60" />
          <Headphones v-else class="h-5 w-5 shrink-0 opacity-60" />
          <span class="truncate">{{ channel.name }}</span>
          <span v-if="hasUnread" class="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent v-if="isOwner" class="w-48">
        <ContextMenuItem @click="handleEdit" class="gap-2">
          <Pencil class="h-4 w-4" />
          {{ $t('channel.editChannel') }}
        </ContextMenuItem>
        <ContextMenuItem @click="showDeleteDialog = true" class="gap-2 text-destructive focus:text-destructive">
          <Trash2 class="h-4 w-4" />
          {{ $t('channel.deleteChannel') }}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <!-- Voice channel connected users -->
    <div v-if="channel.type === 'voice' && voiceMembers.length > 0" class="ml-6 space-y-0.5 pb-1">
      <div
        v-for="member in voiceMembers"
        :key="member.userId"
        class="flex items-center gap-2 rounded px-2 py-0.5 text-xs text-muted-foreground"
      >
        <div class="relative shrink-0">
          <UserAvatar :src="member.avatar" :alt="member.displayName" size="xs" />
          <div v-if="member.speaking" class="absolute inset-0 rounded-full ring-2 ring-primary" />
        </div>
        <span :class="['truncate', member.speaking ? 'text-primary font-medium' : '']">{{ member.displayName }}</span>
        <Monitor v-if="member.streaming" class="ml-auto h-3 w-3 shrink-0 text-primary" />
        <MicOff v-if="member.selfMute" class="h-3 w-3 shrink-0 text-destructive/70" :class="{ 'ml-auto': !member.streaming }" />
      </div>
    </div>

    <DeleteConfirmDialog
      :open="showDeleteDialog"
      title="Delete Channel"
      :description="`Are you sure you want to delete #${channel.name}? This cannot be undone.`"
      @update:open="showDeleteDialog = $event"
      @confirm="handleDelete"
    />

    <!-- Voice channel switch confirmation -->
    <AlertDialog :open="showSwitchDialog" @update:open="showSwitchDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch Voice Channel</AlertDialogTitle>
          <AlertDialogDescription>
            You're already connected to a voice channel. Switch to {{ channel.name }}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="confirmSwitch">Switch</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
