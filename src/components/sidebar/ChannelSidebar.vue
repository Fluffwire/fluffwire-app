<script setup lang="ts">
import { ref, computed, watch, provide, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useVoiceStore } from '@/stores/voice'
import { useMembersStore } from '@/stores/members'
import { canManageServer, canManageChannels } from '@/constants/tiers'
import type { Tier } from '@/constants/tiers'
import ChannelItem from '@/components/channels/ChannelItem.vue'
import ChannelCategory from '@/components/channels/ChannelCategory.vue'
import UserPanel from './UserPanel.vue'
import VoicePanel from '@/components/voice/VoicePanel.vue'
import DMList from '@/components/friends/DMList.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, Plus, FolderPlus, Settings, UserPlus } from 'lucide-vue-next'
import Sortable from 'sortablejs'
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
const voiceStore = useVoiceStore()
const membersStore = useMembersStore()

const isHome = computed(() => route.path.startsWith('/channels/@me'))
const serverId = computed(() => route.params.serverId as string)

const isOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)

const canManageServerSettings = computed(() => {
  if (!serverId.value || serverId.value === '@me') return false
  const member = membersStore.getMembers(serverId.value).find(m => m.userId === authStore.user?.id)
  if (!member) return false
  return canManageServer(member.tier as Tier)
})

const canCreateChannels = computed(() => {
  if (!serverId.value || serverId.value === '@me') return false
  const member = membersStore.getMembers(serverId.value).find(m => m.userId === authStore.user?.id)
  if (!member) return false
  return canManageChannels(member.tier as Tier)
})

const showVoicePanel = computed(() =>
  voiceStore.isInVoice && voiceStore.currentServerId === serverId.value
)

watch(serverId, (id) => {
  if (id && id !== '@me') {
    serversStore.currentServerId = id
    channelsStore.fetchChannels(id)
  }
}, { immediate: true })

// Mutable local arrays synced from the store
const uncategorizedList = ref<Channel[]>([])
const categoryList = ref<CategoryType[]>([])

watch(
  () => [channelsStore.channels, channelsStore.categories] as const,
  () => {
    uncategorizedList.value = channelsStore
      .channelsByCategory(null)
      .slice()
      .sort((a, b) => a.position - b.position)

    categoryList.value = channelsStore.categories
      .slice()
      .sort((a, b) => a.position - b.position)
  },
  { immediate: true, deep: true },
)

function categorizedChannels(categoryId: string) {
  return channelsStore
    .channelsByCategory(categoryId)
    .slice()
    .sort((a, b) => a.position - b.position)
}

function navigateAndClose(path: string) {
  router.push(path)
  if (uiStore.isMobileView) {
    uiStore.isMobileSidebarOpen = false
  } else if (uiStore.isTabletView) {
    uiStore.isChannelSidebarOpen = false
  }
}

// --- Drag-and-drop via SortableJS ---

const sidebarEl = ref<HTMLElement | null>(null)
const channelDragEl = ref<HTMLElement | null>(null)
const categoryDragEl = ref<HTMLElement | null>(null)
let channelSortable: Sortable | null = null
let categorySortable: Sortable | null = null

// Shared callback: reads ALL channel containers from the DOM to build the full position map.
// Called when a channel is dragged in any container (uncategorized or within a category).
function syncChannelPositions() {
  if (!sidebarEl.value) return
  const allPositions: { id: string; position: number; categoryId: string | null }[] = []

  // Query all channel containers (uncategorized + each category)
  const containers = sidebarEl.value.querySelectorAll('[data-channel-container]')
  containers.forEach((container) => {
    const categoryId = (container as HTMLElement).dataset.categoryId || null
    const children = Array.from(container.children)
    children.forEach((child, i) => {
      const id = (child as HTMLElement).dataset.id
      if (id) {
        allPositions.push({ id, position: i, categoryId })
      }
    })
  })

  if (allPositions.length > 0) {
    channelsStore.reorderChannels(serverId.value, allPositions)
    // Reinitialize sortables after reordering to sync internal state
    setTimeout(() => initSortables(), 100)
  }
}

// Provide to ChannelCategory children so they can use the same callback
provide('onChannelDragEnd', syncChannelPositions)

function onCategoriesDragEnd() {
  if (!categoryDragEl.value) return
  const ids = Array.from(categoryDragEl.value.children).map((el) => (el as HTMLElement).dataset.id!).filter(Boolean)
  const positions = ids.map((id, i) => ({ id, position: i }))
  channelsStore.reorderCategories(serverId.value, positions)
  // Reinitialize sortables after reordering to sync internal state
  setTimeout(() => initSortables(), 100)
}

function initSortables() {
  destroySortables()

  if (channelDragEl.value && canCreateChannels.value) {
    channelSortable = Sortable.create(channelDragEl.value, {
      group: 'channels',
      animation: 150,
      ghostClass: 'opacity-30',
      chosenClass: 'opacity-50',
      dragClass: 'opacity-0',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      swapThreshold: 0.65,
      invertSwap: true,
      onEnd: syncChannelPositions,
    })
  }

  if (categoryDragEl.value && canCreateChannels.value) {
    categorySortable = Sortable.create(categoryDragEl.value, {
      animation: 150,
      ghostClass: 'opacity-30',
      handle: '.category-drag-handle',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onEnd: onCategoriesDragEnd,
    })
  }
}

function destroySortables() {
  channelSortable?.destroy()
  channelSortable = null
  categorySortable?.destroy()
  categorySortable = null
}

// Re-init when element refs appear or permission status changes
watch([channelDragEl, categoryDragEl, canCreateChannels], initSortables, { flush: 'post' })

onBeforeUnmount(destroySortables)
</script>

<template>
  <aside
    ref="sidebarEl"
    :class="[
      'flex flex-col bg-card border-r border-border/50',
      isSheet ? 'w-full h-full' : 'w-60 h-full shrink-0',
    ]"
  >
    <!-- Header -->
    <div :class="[
      'flex h-12 items-center border-b border-border/50 px-4',
      isSheet ? 'pr-12' : ''
    ]">
      <template v-if="isHome">
        <h2 class="font-semibold text-foreground">Direct Messages</h2>
      </template>
      <template v-else-if="serversStore.currentServer">
        <h2 class="min-w-0 flex-1 truncate font-semibold text-foreground">
          {{ serversStore.currentServer.name }}
        </h2>
        <TooltipProvider :delay-duration="200">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                @click="uiStore.openModal('invite', serversStore.currentServer?.id)"
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                <UserPlus class="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{{ $t('server.inviteModal') }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <button
          v-if="canManageServerSettings"
          @click="uiStore.openModal('serverSettings')"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings class="h-4 w-4" />
        </button>
      </template>
    </div>

    <!-- Accent bar under header -->
    <div class="h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />

    <!-- Channel/DM list -->
    <ScrollArea class="flex-1 min-h-0">
      <div class="px-2 py-2">
        <!-- Home / DM view -->
        <div v-show="isHome">
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
        </div>

        <!-- Server channel view -->
        <div v-show="!isHome">
          <!-- Create channel button -->
          <div class="mb-1 flex items-center justify-between px-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channels</span>
            <TooltipProvider v-if="canCreateChannels" :delay-duration="200">
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
          <div ref="channelDragEl" data-channel-container data-category-id="">
            <div v-for="channel in uncategorizedList" :key="channel.id" :data-id="channel.id">
              <ChannelItem :channel="channel" />
            </div>
          </div>

          <!-- Categories (draggable) -->
          <div ref="categoryDragEl">
            <div v-for="cat in categoryList" :key="cat.id" :data-id="cat.id">
              <ChannelCategory
                :category="cat"
                :channels="categorizedChannels(cat.id)"
                class="category-drag-handle"
              />
            </div>
          </div>

          <!-- Create category button -->
          <button
            v-if="canCreateChannels"
            @click="uiStore.openModal('createCategory')"
            class="mt-3 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <FolderPlus class="h-4 w-4" />
            <span>Create Category</span>
          </button>
        </div>
      </div>
    </ScrollArea>

    <!-- Voice panel (shown when in voice for this server) -->
    <VoicePanel v-if="showVoicePanel" />

    <!-- User panel at bottom -->
    <UserPanel />
  </aside>
</template>
