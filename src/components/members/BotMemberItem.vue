<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useServersStore } from '@/stores/servers'
import { useLabelsStore } from '@/stores/labels'
import { useMembersStore } from '@/stores/members'
import { botApi } from '@/services/botApi'
import { canManageLabels } from '@/constants/tiers'
import type { Tier } from '@/constants/tiers'
import UserAvatar from '@/components/common/UserAvatar.vue'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from '@/components/ui/context-menu'
import { Copy, Trash2, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { BotMember } from '@/types'

const props = defineProps<{
  botMember: BotMember
  serverId: string
}>()

const emit = defineEmits<{
  labelsChanged: [botId: string, labelIds: string[]]
}>()

const authStore = useAuthStore()
const serversStore = useServersStore()
const labelsStore = useLabelsStore()
const membersStore = useMembersStore()

const canManageBots = computed(() => {
  const server = serversStore.servers.find(s => s.id === props.serverId)
  if (!server || !authStore.user) return false
  return server.ownerId === authStore.user.id
})

const currentMemberTier = computed(() => {
  const members = membersStore.getMembers(props.serverId)
  return members.find(m => m.userId === authStore.user?.id)?.tier
})

const canAssignLabels = computed(() => {
  const tier = currentMemberTier.value
  return tier && canManageLabels(tier as Tier)
})

const availableLabels = computed(() => labelsStore.getLabels(props.serverId))

// Per-label computed refs for checkbox state
const labelComputeds = new Map<string, ReturnType<typeof computed<boolean>>>()

watch(availableLabels, (labels) => {
  labels.forEach(label => {
    if (!labelComputeds.has(label.id)) {
      labelComputeds.set(label.id, computed({
        get: () => props.botMember.labels?.includes(label.id) ?? false,
        set: async (value: boolean) => {
          try {
            const current = props.botMember.labels || []
            const newLabels = value
              ? [...current, label.id]
              : current.filter(id => id !== label.id)
            await botApi.assignBotLabels(props.serverId, props.botMember.botId, newLabels)
            emit('labelsChanged', props.botMember.botId, newLabels)
            toast.success('Labels updated')
          } catch {
            toast.error('Failed to update labels')
          }
        }
      }))
    }
  })
}, { immediate: true })

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
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } }
    toast.error(err.response?.data?.error || 'Failed to remove bot')
  }
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div class="group relative flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent/50 transition-colors">
        <div class="relative">
          <UserAvatar :src="botMember.bot.avatar" :alt="botMember.bot.name" size="sm" :is-bot="true" />
          <!-- Online status indicator -->
          <span
            v-if="botMember.status"
            :class="[
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
              botMember.status === 'online' ? 'bg-online' : 'bg-offline'
            ]"
            :title="botMember.status === 'online' ? 'Online' : 'Offline'"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-foreground">{{ botMember.bot.name }}</p>
          <p v-if="botMember.status" class="text-xs text-muted-foreground">
            {{ botMember.status === 'online' ? 'Online' : 'Offline' }}
          </p>
        </div>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @click="copyBotId">
        <Copy class="mr-2 h-4 w-4" />
        Copy Bot ID
      </ContextMenuItem>
      <template v-if="canAssignLabels">
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <User class="mr-2 h-4 w-4" />
            Assign Labels
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuCheckboxItem
              v-for="label in availableLabels.filter(l => !l.isEveryone)"
              :key="label.id"
              v-model="labelComputeds.get(label.id)!.value"
            >
              <div class="flex items-center gap-2">
                <div
                  class="h-2.5 w-2.5 rounded-full"
                  :style="{ backgroundColor: label.color || '#99aab5' }"
                />
                <span>{{ label.name }}</span>
              </div>
            </ContextMenuCheckboxItem>
            <ContextMenuItem v-if="availableLabels.filter(l => !l.isEveryone).length === 0" disabled>
              No labels
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </template>
      <template v-if="canManageBots">
        <ContextMenuSeparator />
        <ContextMenuItem class="text-destructive focus:text-destructive" @click="removeBot">
          <Trash2 class="mr-2 h-4 w-4" />
          Remove from Server
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>
</template>
