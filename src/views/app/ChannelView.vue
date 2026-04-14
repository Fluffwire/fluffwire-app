<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { useCommandsStore } from '@/stores/commands'
import ChatArea from '@/components/chat/ChatArea.vue'
import VoiceChannelView from './VoiceChannelView.vue'

const route = useRoute()
const channelsStore = useChannelsStore()
const serversStore = useServersStore()
const authStore = useAuthStore()
const commandsStore = useCommandsStore()

const channelId = computed(() => route.params.channelId as string)
const serverId = computed(() => route.params.serverId as string)
watch(channelId, (id) => {
  channelsStore.currentChannelId = id
}, { immediate: true })
const channel = computed(() => channelsStore.currentChannel)
const isServerOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)

// Fetch commands when entering a server
watch(serverId, (newServerId) => {
  if (newServerId && newServerId !== '@me') {
    commandsStore.fetchServerCommands(newServerId)
  }
}, { immediate: true })
</script>

<template>
  <VoiceChannelView
    v-if="channel && channel.type === 'voice'"
  />
  <ChatArea
    v-else-if="channel"
    :channel-id="channel.id"
    :channel-name="channel.name"
    :is-server-owner="isServerOwner"
  />
  <div v-else class="flex h-full items-center justify-center text-muted-foreground">
    Select a channel to start chatting
  </div>
</template>
