<script setup lang="ts">
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useReadStateStore } from '@/stores/readState'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import ServerIcon from './ServerIcon.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Plus } from 'lucide-vue-next'

interface Props {
  isSheet?: boolean
}

withDefaults(defineProps<Props>(), { isSheet: false })

const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const readStateStore = useReadStateStore()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

function isActive(serverId: string) {
  return route.params.serverId === serverId
}

function navigateHome() {
  router.push('/channels/@me')
  if (uiStore.isMobileView) uiStore.isMobileSidebarOpen = false
}

async function navigateToServer(serverId: string) {
  await channelsStore.fetchChannels(serverId)
  const firstChannel = channelsStore.textChannels[0]
  router.push(`/channels/${serverId}/${firstChannel?.id ?? ''}`)
  if (uiStore.isMobileView) uiStore.isMobileSidebarOpen = false
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <nav
      :class="[
        'flex h-full flex-col items-center gap-2 overflow-y-auto bg-gradient-to-b from-sidebar to-background py-3',
        isSheet ? 'w-full' : 'w-[72px] shrink-0',
      ]"
    >
      <!-- Home button -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            @click="navigateHome"
            :class="[
              'group flex h-14 w-14 items-center justify-center transition-all duration-200',
              route.path.startsWith('/channels/@me')
                ? 'rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'rounded-[28px] bg-secondary text-foreground hover:rounded-2xl hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/15',
            ]"
          >
            <svg class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.53 4.306v15.363c0 .988-.544 1.896-1.414 2.363l-7.7 4.139a2.74 2.74 0 01-2.632.039l-7.7-4.139A2.72 2.72 0 01.67 19.669V4.306C.67 3.32 1.214 2.41 2.084 1.944L9.784.166a2.74 2.74 0 012.632-.039l7.7 1.778a2.72 2.72 0 011.414 2.401z" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Home</TooltipContent>
      </Tooltip>

      <Separator class="mx-auto w-8" />

      <!-- Server icons -->
      <Tooltip v-for="server in serversStore.servers" :key="server.id">
        <TooltipTrigger as-child>
          <div class="relative">
            <ServerIcon
              :server="server"
              :active="isActive(server.id)"
              @click="navigateToServer(server.id)"
            />
            <span
              v-if="!isActive(server.id) && readStateStore.hasUnreadInServer(server.id)"
              class="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-foreground"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{{ server.name }}</TooltipContent>
      </Tooltip>

      <!-- Add server button -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            @click="uiStore.openModal('createServer')"
            class="flex h-14 w-14 items-center justify-center rounded-[28px] border-2 border-dashed border-primary/40 text-primary transition-all duration-200 hover:rounded-2xl hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/15"
          >
            <Plus class="h-6 w-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Add a Server</TooltipContent>
      </Tooltip>
    </nav>
  </TooltipProvider>
</template>
