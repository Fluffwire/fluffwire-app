import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Channel, ChannelCategory, CreateChannelPayload } from '@/types'
import { channelApi } from '@/services/channelApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

export const useChannelsStore = defineStore('channels', () => {
  const channels = ref<Channel[]>([])
  const categories = ref<ChannelCategory[]>([])
  const currentChannelId = ref<string | null>(null)
  const isLoading = ref(false)

  const currentChannel = computed(() =>
    channels.value.find((c) => c.id === currentChannelId.value) ?? null
  )

  const textChannels = computed(() =>
    channels.value.filter((c) => c.type === 'text')
  )

  const voiceChannels = computed(() =>
    channels.value.filter((c) => c.type === 'voice')
  )

  function channelsByCategory(categoryId: string | null) {
    return channels.value.filter((c) => c.categoryId === categoryId)
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.CHANNEL_CREATE, (data: unknown) => {
      channels.value.push(data as Channel)
    })
    wsDispatcher.register(WS_EVENTS.CHANNEL_UPDATE, (data: unknown) => {
      const updated = data as Channel
      const idx = channels.value.findIndex((c) => c.id === updated.id)
      if (idx !== -1) channels.value[idx] = updated
    })
    wsDispatcher.register(WS_EVENTS.CHANNEL_DELETE, (data: unknown) => {
      const { id } = data as { id: string }
      channels.value = channels.value.filter((c) => c.id !== id)
    })
  }
  setupWsHandlers()

  async function fetchChannels(serverId: string) {
    isLoading.value = true
    try {
      const { data } = await channelApi.getChannels(serverId)
      channels.value = data.channels
      categories.value = data.categories
    } finally {
      isLoading.value = false
    }
  }

  async function createChannel(serverId: string, payload: CreateChannelPayload) {
    const { data } = await channelApi.createChannel(serverId, payload)
    channels.value.push(data)
    return data
  }

  async function deleteChannel(channelId: string) {
    await channelApi.deleteChannel(channelId)
    channels.value = channels.value.filter((c) => c.id !== channelId)
  }

  function clearChannels() {
    channels.value = []
    categories.value = []
    currentChannelId.value = null
  }

  return {
    channels,
    categories,
    currentChannelId,
    currentChannel,
    textChannels,
    voiceChannels,
    isLoading,
    channelsByCategory,
    fetchChannels,
    createChannel,
    deleteChannel,
    clearChannels,
  }
})
