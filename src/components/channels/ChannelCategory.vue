<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Channel, ChannelCategory as CategoryType } from '@/types'
import { useUiStore } from '@/stores/ui'
import { useChannelsStore } from '@/stores/channels'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import ChannelItem from './ChannelItem.vue'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { toast } from 'vue-sonner'
import Sortable from 'sortablejs'
import { isTauri } from '@/utils/platform'

interface Props {
  category: CategoryType
  channels: Channel[]
}

const props = defineProps<Props>()
const route = useRoute()
const { t } = useI18n()
const uiStore = useUiStore()
const channelsStore = useChannelsStore()
const serversStore = useServersStore()
const authStore = useAuthStore()

const isCollapsed = ref(false)
const showDeleteDialog = ref(false)
const channelListEl = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

const isOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)

// Injected from ChannelSidebar — called when any channel drag ends
const onChannelDragEnd = inject<() => void>('onChannelDragEnd', () => {})

function initSortable() {
  sortableInstance?.destroy()
  sortableInstance = null

  if (channelListEl.value && isOwner.value) {
    sortableInstance = Sortable.create(channelListEl.value, {
      group: 'channels',
      animation: 150,
      ghostClass: 'opacity-30',
      chosenClass: 'opacity-50',
      dragClass: 'opacity-0',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      forceFallback: isTauri(),
      fallbackOnBody: true,
      swapThreshold: 0.65,
      invertSwap: true,
      onEnd: onChannelDragEnd,
    })
  }
}

watch([channelListEl, isOwner], initSortable, { flush: 'post' })
onBeforeUnmount(() => { sortableInstance?.destroy() })

function handleCreateChannel() {
  uiStore.openModal('createChannel', { categoryId: props.category.id })
}

function handleEditCategory() {
  uiStore.openModal('editCategory', props.category)
}

async function handleDeleteCategory() {
  try {
    await channelsStore.deleteCategory(
      route.params.serverId as string,
      props.category.id,
    )
    toast.success(t('channel.categoryDeleted'))
    showDeleteDialog.value = false
  } catch {
    toast.error(t('channel.failedDeleteCategory'))
  }
}
</script>

<template>
  <div class="mt-4">
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div class="flex items-center justify-between px-1">
          <button
            @click="isCollapsed = !isCollapsed"
            class="flex flex-1 items-center gap-0.5 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              :class="['h-3 w-3 transition-transform', isCollapsed ? '-rotate-90' : '']"
            />
            <span>{{ category.name }}</span>
          </button>

          <button
            v-if="isOwner"
            @click.stop="handleCreateChannel"
            class="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus class="h-3.5 w-3.5" />
          </button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent v-if="isOwner" class="w-52">
        <ContextMenuItem @click="handleCreateChannel" class="gap-2">
          <Plus class="h-4 w-4" />
          {{ $t('channel.createChannel') }}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem @click="handleEditCategory" class="gap-2">
          <Pencil class="h-4 w-4" />
          {{ $t('channel.editCategory') }}
        </ContextMenuItem>
        <ContextMenuItem @click="showDeleteDialog = true" class="gap-2 text-destructive focus:text-destructive">
          <Trash2 class="h-4 w-4" />
          {{ $t('channel.deleteCategory') }}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <div
      v-show="!isCollapsed"
      ref="channelListEl"
      class="mt-0.5"
      data-channel-container
      :data-category-id="category.id"
    >
      <div v-for="channel in channels" :key="channel.id" :data-id="channel.id">
        <ChannelItem :channel="channel" />
      </div>
      <!-- Drop zone for easier channel dropping, especially when category is empty -->
      <div
        v-if="isOwner"
        class="h-8 w-full"
        :class="channels.length === 0 ? 'h-12' : ''"
        data-drop-zone
      />
    </div>

    <DeleteConfirmDialog
      :open="showDeleteDialog"
      title="Delete Category"
      :description="`Are you sure you want to delete '${category.name}'? Channels in this category will become uncategorized.`"
      @update:open="showDeleteDialog = $event"
      @confirm="handleDeleteCategory"
    />
  </div>
</template>
