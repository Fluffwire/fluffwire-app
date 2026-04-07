<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useServersStore } from '@/stores/servers'
import { botApi } from '@/services/botApi'
import UserAvatar from '@/components/common/UserAvatar.vue'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Copy, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { BotMember } from '@/types'

const props = defineProps<{
  botMember: BotMember
  serverId: string
}>()

const authStore = useAuthStore()
const serversStore = useServersStore()

const canManageBots = computed(() => {
  const server = serversStore.servers.find(s => s.id === props.serverId)
  if (!server || !authStore.user) return false
  return server.ownerId === authStore.user.id
})

async function copyBotId() {
  try {
    await navigator.clipboard.writeText(props.botMember.botId)
    toast.success('Bot ID copied to clipboard')
  } catch {
    toast.error('Failed to copy bot ID')
  }
}

async function removeBot() {
  if (!canManageBots.value) return

  try {
    await botApi.removeBotFromServer(props.serverId, props.botMember.botId)
    toast.success('Bot removed from server')
    // Refresh the member sidebar
    window.location.reload() // TODO: Better way to refresh the sidebar
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to remove bot')
  }
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div class="group relative flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent/50 transition-colors">
        <div class="relative">
          <UserAvatar :src="botMember.bot.avatar" :alt="botMember.bot.name" size="sm" :is-bot="true" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-foreground">{{ botMember.bot.name }}</p>
        </div>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @click="copyBotId">
        <Copy class="mr-2 h-4 w-4" />
        Copy Bot ID
      </ContextMenuItem>
      <ContextMenuItem v-if="canManageBots" @click="removeBot" class="text-destructive focus:text-destructive">
        <Trash2 class="mr-2 h-4 w-4" />
        Remove from Server
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
