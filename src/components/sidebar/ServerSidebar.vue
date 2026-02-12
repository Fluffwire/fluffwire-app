<script setup lang="ts">
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import ServerIcon from './ServerIcon.vue'

const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

function isActive(serverId: string) {
  return route.params.serverId === serverId
}

function navigateHome() {
  router.push('/channels/@me')
}

async function navigateToServer(serverId: string) {
  await channelsStore.fetchChannels(serverId)
  const firstChannel = channelsStore.textChannels[0]
  router.push(`/channels/${serverId}/${firstChannel?.id ?? ''}`)
}
</script>

<template>
  <nav class="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-server-bg py-3">
    <!-- Home button -->
    <button
      @click="navigateHome"
      :class="[
        'group flex h-12 w-12 items-center justify-center rounded-[24px] transition-all duration-200',
        'hover:rounded-[16px]',
        route.path.startsWith('/channels/@me')
          ? 'rounded-[16px] bg-blurple text-white'
          : 'bg-chat-bg text-text-primary hover:bg-blurple hover:text-white',
      ]"
    >
      <svg class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21.53 4.306v15.363c0 .988-.544 1.896-1.414 2.363l-7.7 4.139a2.74 2.74 0 01-2.632.039l-7.7-4.139A2.72 2.72 0 01.67 19.669V4.306C.67 3.32 1.214 2.41 2.084 1.944L9.784.166a2.74 2.74 0 012.632-.039l7.7 1.778a2.72 2.72 0 011.414 2.401z" />
      </svg>
    </button>

    <div class="mx-auto w-8 border-t-2 border-border" />

    <!-- Server icons -->
    <ServerIcon
      v-for="server in serversStore.servers"
      :key="server.id"
      :server="server"
      :active="isActive(server.id)"
      @click="navigateToServer(server.id)"
    />

    <!-- Add server button -->
    <button
      @click="uiStore.openModal('createServer')"
      class="flex h-12 w-12 items-center justify-center rounded-[24px] bg-chat-bg text-online transition-all duration-200 hover:rounded-[16px] hover:bg-online hover:text-white"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </nav>
</template>
