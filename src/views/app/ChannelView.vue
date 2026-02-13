<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import ChatArea from '@/components/chat/ChatArea.vue'
import VoiceChannelView from './VoiceChannelView.vue'

const route = useRoute()
const channelsStore = useChannelsStore()
const serversStore = useServersStore()
const authStore = useAuthStore()

const channelId = computed(() => route.params.channelId as string)
const channel = computed(() => {
  channelsStore.currentChannelId = channelId.value
  return channelsStore.currentChannel
})
const isServerOwner = computed(() =>
  serversStore.currentServer?.ownerId === authStore.user?.id
)
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
