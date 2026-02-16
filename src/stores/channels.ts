import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Channel, ChannelCategory, ChannelAccessMode, CreateChannelPayload } from '@/types'
import { channelApi } from '@/services/channelApi'
import type { ChannelPositionPayload, CategoryPositionPayload } from '@/services/channelApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { useReadStateStore } from './readState'

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
      const ch = data as Channel
      if (!channels.value.some((c) => c.id === ch.id)) {
        channels.value.push(ch)
      }
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
    wsDispatcher.register(WS_EVENTS.CHANNELS_REORDER, (data: unknown) => {
      channels.value = data as Channel[]
    })
    wsDispatcher.register(WS_EVENTS.CATEGORY_CREATE, (data: unknown) => {
      const cat = data as ChannelCategory
      if (!categories.value.some((c) => c.id === cat.id)) {
        categories.value.push(cat)
      }
    })
    wsDispatcher.register(WS_EVENTS.CATEGORY_UPDATE, (data: unknown) => {
      const updated = data as ChannelCategory
      const idx = categories.value.findIndex((c) => c.id === updated.id)
      if (idx !== -1) categories.value[idx] = updated
    })
    wsDispatcher.register(WS_EVENTS.CATEGORY_DELETE, (data: unknown) => {
      const { id } = data as { id: string }
      categories.value = categories.value.filter((c) => c.id !== id)
    })
    wsDispatcher.register(WS_EVENTS.CATEGORIES_REORDER, (data: unknown) => {
      categories.value = data as ChannelCategory[]
    })
  }
  setupWsHandlers()

  async function fetchChannels(serverId: string) {
    isLoading.value = true
    try {
      const { data } = await channelApi.getChannels(serverId)
      channels.value = data.channels
      categories.value = data.categories
      // Register channel→server mappings for unread tracking
      const readStateStore = useReadStateStore()
      for (const ch of data.channels) {
        readStateStore.registerChannelServer(ch.id, ch.serverId)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function createChannel(serverId: string, payload: CreateChannelPayload) {
    const { data } = await channelApi.createChannel(serverId, payload)
    // Push immediately from API response (dedup-guarded)
    if (!channels.value.some((c) => c.id === data.id)) {
      channels.value.push(data)
    }
    return data
  }

  async function updateChannel(channelId: string, payload: {
    name?: string
    topic?: string
    accessMode?: ChannelAccessMode
    allowedUserIds?: string[]
    allowedLabelIds?: string[]
    maxParticipants?: number | null
    uploadsEnabled?: boolean
  }) {
    const { data } = await channelApi.updateChannel(channelId, payload)
    const idx = channels.value.findIndex((c) => c.id === data.id)
    if (idx !== -1) channels.value[idx] = data
    return data
  }

  async function deleteChannel(channelId: string) {
    await channelApi.deleteChannel(channelId)
    channels.value = channels.value.filter((c) => c.id !== channelId)
  }

  async function createCategory(serverId: string, name: string) {
    const { data } = await channelApi.createCategory(serverId, name)
    if (!categories.value.some((c) => c.id === data.id)) {
      categories.value.push(data)
    }
    return data
  }

  async function updateCategory(serverId: string, categoryId: string, name: string) {
    const { data } = await channelApi.updateCategory(serverId, categoryId, name)
    const idx = categories.value.findIndex((c) => c.id === data.id)
    if (idx !== -1) categories.value[idx] = data
    return data
  }

  async function deleteCategory(serverId: string, categoryId: string) {
    await channelApi.deleteCategory(serverId, categoryId)
    categories.value = categories.value.filter((c) => c.id !== categoryId)
    // Channels in this category become uncategorized
    channels.value = channels.value.map((ch) =>
      ch.categoryId === categoryId ? { ...ch, categoryId: null } : ch
    )
  }

  async function reorderChannels(serverId: string, positions: ChannelPositionPayload[]) {
    const { data } = await channelApi.reorderChannels(serverId, positions)
    channels.value = data.channels
    categories.value = data.categories
  }

  async function reorderCategories(serverId: string, positions: CategoryPositionPayload[]) {
    const { data } = await channelApi.reorderCategories(serverId, positions)
    channels.value = data.channels
    categories.value = data.categories
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
    updateChannel,
    deleteChannel,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderChannels,
    reorderCategories,
    clearChannels,
  }
})
