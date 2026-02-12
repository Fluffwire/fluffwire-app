<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import ChannelItem from '@/components/channels/ChannelItem.vue'
import ChannelCategory from '@/components/channels/ChannelCategory.vue'
import UserPanel from './UserPanel.vue'
import DMList from '@/components/friends/DMList.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, Plus, FolderPlus } from 'lucide-vue-next'
import draggable from 'vuedraggable'
import type { Channel, ChannelCategory as CategoryType } from '@/types'

interface Props {
  isSheet?: boolean
}

withDefaults(defineProps<Props>(), { isSheet: false })

const route = useRoute()
const router = useRouter()
const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const dmStore = useDirectMessagesStore()
const uiStore = useUiStore()
const authStore = useAuthStore()

const isHome = computed(() => route.path.startsWith('/channels/@me'))
const serverId = computed(() => route.params.serverId as string)

const isOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)

watch(serverId, (id) => {
  if (id && id !== '@me') {
    serversStore.currentServerId = id
    channelsStore.fetchChannels(id)
  }
}, { immediate: true })

const uncategorizedChannels = computed(() =>
  [...channelsStore.channelsByCategory(null)].sort((a, b) => a.position - b.position)
)

const sortedCategories = computed(() =>
  [...channelsStore.categories].sort((a, b) => a.position - b.position)
)

function categorizedChannels(categoryId: string) {
  return [...channelsStore.channelsByCategory(categoryId)].sort((a, b) => a.position - b.position)
}

function navigateAndClose(path: string) {
  router.push(path)
  if (uiStore.isMobileView || uiStore.isTabletView) {
    uiStore.isChannelSidebarOpen = false
  }
}

function collectAllPositions() {
  // Gather all channel positions from the current DOM order
  const allPositions: { id: string; position: number; categoryId: string | null }[] = []

  uncategorizedChannels.value.forEach((ch, i) => {
    allPositions.push({ id: ch.id, position: i, categoryId: null })
  })

  sortedCategories.value.forEach((cat) => {
    categorizedChannels(cat.id).forEach((ch, i) => {
      allPositions.push({ id: ch.id, position: i, categoryId: cat.id })
    })
  })

  return allPositions
}

function onChannelDragEnd() {
  channelsStore.reorderChannels(serverId.value, collectAllPositions())
}

function onCategoriesDragEnd(evt: unknown) {
  const cats = sortedCategories.value
  const positions = cats.map((cat, i) => ({ id: cat.id, position: i }))
  channelsStore.reorderCategories(serverId.value, positions)
}
</script>

<template>
  <aside
    :class="[
      'flex h-full flex-col bg-card border-r border-border/50',
      isSheet ? 'w-full' : 'w-60 shrink-0',
    ]"
  >
    <!-- Header -->
    <div class="flex h-12 items-center border-b border-border/50 px-4">
      <template v-if="isHome">
        <h2 class="font-semibold text-foreground">Direct Messages</h2>
      </template>
      <template v-else-if="serversStore.currentServer">
        <h2 class="truncate font-semibold text-foreground">
          {{ serversStore.currentServer.name }}
        </h2>
      </template>
    </div>

    <!-- Accent bar under header -->
    <div class="h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />

    <!-- Channel/DM list -->
    <ScrollArea class="flex-1">
      <div class="px-2 py-2">
        <template v-if="isHome">
          <!-- Friends nav link -->
          <button
            @click="navigateAndClose('/channels/@me')"
            :class="[
              'mb-1 flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
              route.path === '/channels/@me'
                ? 'border-l-2 border-primary bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            ]"
          >
            <Users class="h-5 w-5" />
            <span class="text-sm font-medium">Friends</span>
          </button>

          <div class="mb-2 mt-4 flex items-center justify-between px-2">
            <span class="text-xs font-semibold uppercase text-muted-foreground">Direct Messages</span>
          </div>

          <DMList />
        </template>

        <template v-else>
          <!-- Create channel button -->
          <div class="mb-1 flex items-center justify-between px-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channels</span>
            <TooltipProvider v-if="isOwner" :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    @click="uiStore.openModal('createChannel')"
                    class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus class="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Create Channel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <!-- Uncategorized channels (draggable) -->
          <draggable
            :list="uncategorizedChannels"
            item-key="id"
            group="channels"
            :animation="150"
            ghost-class="opacity-30"
            :disabled="!isOwner"
            @end="onChannelDragEnd"
          >
            <template #item="{ element }">
              <ChannelItem :channel="element" />
            </template>
          </draggable>

          <!-- Categories (draggable) -->
          <draggable
            :list="sortedCategories"
            item-key="id"
            :animation="150"
            handle=".category-drag-handle"
            ghost-class="opacity-30"
            :disabled="!isOwner"
            @end="onCategoriesDragEnd"
          >
            <template #item="{ element: cat }">
              <div>
                <ChannelCategory
                  :category="cat"
                  :channels="categorizedChannels(cat.id)"
                  class="category-drag-handle"
                />
              </div>
            </template>
          </draggable>

          <!-- Create category button -->
          <button
            v-if="isOwner"
            @click="uiStore.openModal('createCategory')"
            class="mt-3 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <FolderPlus class="h-4 w-4" />
            <span>Create Category</span>
          </button>
        </template>
      </div>
    </ScrollArea>

    <!-- User panel at bottom -->
    <UserPanel />
  </aside>
</template>
