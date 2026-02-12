<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Channel } from '@/types'
import { useVoiceStore } from '@/stores/voice'
import { useUiStore } from '@/stores/ui'
import { useChannelsStore } from '@/stores/channels'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { Hash, Headphones, Pencil, Trash2 } from 'lucide-vue-next'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { toast } from 'vue-sonner'

interface Props {
  channel: Channel
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const voiceStore = useVoiceStore()
const uiStore = useUiStore()
const channelsStore = useChannelsStore()
const serversStore = useServersStore()
const authStore = useAuthStore()

const showDeleteDialog = ref(false)

const isActive = computed(() => route.params.channelId === props.channel.id)

const isOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)

function handleClick() {
  router.push(`/channels/${props.channel.serverId}/${props.channel.id}`)
  if (props.channel.type === 'voice') {
    voiceStore.joinChannel(props.channel.serverId, props.channel.id)
  }
  if (uiStore.isMobileView || uiStore.isTabletView) {
    uiStore.isChannelSidebarOpen = false
  }
}

function handleEdit() {
  uiStore.openModal('editChannel', props.channel)
}

async function handleDelete() {
  try {
    await channelsStore.deleteChannel(props.channel.id)
    toast.success('Channel deleted')
    showDeleteDialog.value = false
  } catch {
    toast.error('Failed to delete channel')
  }
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <button
        @click="handleClick"
        :class="[
          'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'border-l-2 border-primary bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        ]"
      >
        <Hash v-if="channel.type === 'text'" class="h-5 w-5 shrink-0 opacity-60" />
        <Headphones v-else class="h-5 w-5 shrink-0 opacity-60" />
        <span class="truncate">{{ channel.name }}</span>
      </button>
    </ContextMenuTrigger>

    <ContextMenuContent v-if="isOwner" class="w-48">
      <ContextMenuItem @click="handleEdit" class="gap-2">
        <Pencil class="h-4 w-4" />
        Edit Channel
      </ContextMenuItem>
      <ContextMenuItem @click="showDeleteDialog = true" class="gap-2 text-destructive focus:text-destructive">
        <Trash2 class="h-4 w-4" />
        Delete Channel
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>

  <DeleteConfirmDialog
    :open="showDeleteDialog"
    title="Delete Channel"
    :description="`Are you sure you want to delete #${channel.name}? This cannot be undone.`"
    @update:open="showDeleteDialog = $event"
    @confirm="handleDelete"
  />
</template>
