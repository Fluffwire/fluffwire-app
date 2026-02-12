<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { Home, MessageSquare, Server, Settings } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const isHome = computed(() => route.path.startsWith('/channels/@me'))
const isChat = computed(() => route.params.channelId != null)
const isSettings = computed(() => route.path === '/settings')

function goHome() {
  router.push('/channels/@me')
}

function toggleServers() {
  uiStore.isMobileSidebarOpen = !uiStore.isMobileSidebarOpen
}

function toggleChannels() {
  uiStore.isChannelSidebarOpen = !uiStore.isChannelSidebarOpen
}

function goSettings() {
  router.push('/settings')
}

const navItems = [
  { key: 'home', label: 'Home', icon: Home, action: goHome },
  { key: 'servers', label: 'Servers', icon: Server, action: toggleServers },
  { key: 'chat', label: 'Channels', icon: MessageSquare, action: toggleChannels },
  { key: 'settings', label: 'Settings', icon: Settings, action: goSettings },
]

function isItemActive(key: string) {
  if (key === 'home') return isHome.value
  if (key === 'settings') return isSettings.value
  if (key === 'chat') return isChat.value
  return false
}
</script>

<template>
  <TooltipProvider>
    <nav class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 px-2 py-1.5 backdrop-blur-sm">
      <Tooltip v-for="item in navItems" :key="item.key">
        <TooltipTrigger as-child>
          <button
            @click="item.action"
            :class="[
              'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors',
              isItemActive(item.key)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5" />
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{{ item.label }}</TooltipContent>
      </Tooltip>
    </nav>
  </TooltipProvider>
</template>
