<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useDirectMessagesStore } from '@/stores/directMessages'
import ChannelItem from '@/components/channels/ChannelItem.vue'
import ChannelCategory from '@/components/channels/ChannelCategory.vue'
import UserPanel from './UserPanel.vue'
import DMList from '@/components/friends/DMList.vue'

const route = useRoute()
const router = useRouter()
const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const dmStore = useDirectMessagesStore()

const isHome = computed(() => route.path.startsWith('/channels/@me'))
const serverId = computed(() => route.params.serverId as string)

watch(serverId, (id) => {
  if (id && id !== '@me') {
    serversStore.currentServerId = id
    channelsStore.fetchChannels(id)
  }
}, { immediate: true })

const categorizedChannels = computed(() => {
  const cats = channelsStore.categories
  const uncategorized = channelsStore.channelsByCategory(null)

  return {
    uncategorized,
    categories: cats.map((cat) => ({
      ...cat,
      channels: channelsStore.channelsByCategory(cat.id),
    })),
  }
})
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col bg-channel-bg">
    <!-- Header -->
    <div class="flex h-12 items-center border-b border-border/50 px-4 shadow-sm">
      <template v-if="isHome">
        <h2 class="font-semibold text-text-primary">Direct Messages</h2>
      </template>
      <template v-else-if="serversStore.currentServer">
        <h2 class="truncate font-semibold text-text-primary">
          {{ serversStore.currentServer.name }}
        </h2>
      </template>
    </div>

    <!-- Channel/DM list -->
    <div class="flex-1 overflow-y-auto px-2 py-2">
      <template v-if="isHome">
        <!-- Friends nav link -->
        <button
          @click="router.push('/channels/@me')"
          :class="[
            'mb-1 flex w-full items-center gap-3 rounded px-2 py-1.5 text-text-secondary transition-colors',
            route.path === '/channels/@me' ? 'bg-active-bg text-text-primary' : 'hover:bg-hover-bg hover:text-text-primary',
          ]"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span class="text-sm font-medium">Friends</span>
        </button>

        <div class="mb-2 mt-4 flex items-center justify-between px-2">
          <span class="text-xs font-semibold uppercase text-text-secondary">Direct Messages</span>
        </div>

        <DMList />
      </template>

      <template v-else>
        <!-- Uncategorized channels -->
        <ChannelItem
          v-for="channel in categorizedChannels.uncategorized"
          :key="channel.id"
          :channel="channel"
        />

        <!-- Categorized channels -->
        <ChannelCategory
          v-for="cat in categorizedChannels.categories"
          :key="cat.id"
          :category="cat"
          :channels="cat.channels"
        />
      </template>
    </div>

    <!-- User panel at bottom -->
    <UserPanel />
  </aside>
</template>
