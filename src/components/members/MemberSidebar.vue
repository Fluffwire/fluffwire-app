<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMembersStore } from '@/stores/members'
import { useLabelsStore } from '@/stores/labels'
import { usePresenceStore } from '@/stores/presence'
import MemberItem from './MemberItem.vue'
import BotMemberItem from './BotMemberItem.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { botApi } from '@/services/botApi'
import { wsDispatcher } from '@/services/wsDispatcher'
import type { BotMember } from '@/types'

interface Props {
  isSheet?: boolean
}

withDefaults(defineProps<Props>(), { isSheet: false })

const route = useRoute()
const membersStore = useMembersStore()
const labelsStore = useLabelsStore()
const presenceStore = usePresenceStore()

const serverId = computed(() => route.params.serverId as string)
const serverBots = ref<BotMember[]>([])

async function fetchBots(id: string) {
  if (!id || id === '@me') {
    serverBots.value = []
    return
  }
  try {
    const { data } = await botApi.listServerBots(id)
    serverBots.value = data
  } catch {
    serverBots.value = []
  }
}

watch(serverId, async (id) => {
  if (id && id !== '@me') {
    membersStore.fetchMembers(id)
    labelsStore.fetchLabels(id)
    await fetchBots(id)
  }
}, { immediate: true })

// Listen for bot member updates (when bots are added/removed via server settings)
function handleBotMemberUpdate(event: Event) {
  const customEvent = event as CustomEvent
  const { serverId: updatedServerId } = customEvent.detail
  if (updatedServerId === serverId.value) {
    fetchBots(serverId.value)
  }
}

// Handle label assignment from context menu (optimistic local update)
function handleBotLabelsChanged(botId: string, labelIds: string[]) {
  const bot = serverBots.value.find(b => b.botId === botId)
  if (bot) bot.labels = labelIds
}

// Handle BOT_LABEL_UPDATE WebSocket event (updates from other clients)
wsDispatcher.register('BOT_LABEL_UPDATE', (data: unknown) => {
  const { serverId: sid, botId, labelIds } = data as { serverId: string; botId: string; labelIds: string[] }
  if (sid === serverId.value) {
    const bot = serverBots.value.find(b => b.botId === botId)
    if (bot) bot.labels = labelIds
  }
})

onMounted(() => {
  window.addEventListener('bot-member-updated', handleBotMemberUpdate)
})

onUnmounted(() => {
  window.removeEventListener('bot-member-updated', handleBotMemberUpdate)
})

const members = computed(() => membersStore.getMembers(serverId.value))

const onlineMembers = computed(() =>
  members.value.filter((m) => presenceStore.getStatus(m.userId) !== 'offline')
)

const offlineMembers = computed(() =>
  members.value.filter((m) => presenceStore.getStatus(m.userId) === 'offline')
)
</script>

<template>
  <aside
    :class="[
      'flex h-full flex-col bg-card border-l border-border/50',
      isSheet ? 'w-full' : 'w-60 shrink-0',
    ]"
  >
    <ScrollArea class="flex-1">
      <div class="p-4">
        <div v-if="onlineMembers.length" class="mb-4">
          <h3 class="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Online
            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ onlineMembers.length }}</Badge>
          </h3>
          <MemberItem
            v-for="member in onlineMembers"
            :key="member.userId"
            :member="member"
          />
        </div>

        <div v-if="offlineMembers.length">
          <h3 class="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Offline
            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ offlineMembers.length }}</Badge>
          </h3>
          <MemberItem
            v-for="member in offlineMembers"
            :key="member.userId"
            :member="member"
          />
        </div>

        <div v-if="serverBots.length" class="mt-4">
          <h3 class="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Bots
            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ serverBots.length }}</Badge>
          </h3>
          <BotMemberItem
            v-for="bot in serverBots"
            :key="bot.botId"
            :bot-member="bot"
            :server-id="serverId"
            @labels-changed="handleBotLabelsChanged"
          />
        </div>
      </div>
    </ScrollArea>
  </aside>
</template>
