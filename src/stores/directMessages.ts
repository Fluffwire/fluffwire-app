import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DirectMessageChannel } from '@/types'
import { userApi } from '@/services/userApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

export const useDirectMessagesStore = defineStore('directMessages', () => {
  const dmChannels = ref<DirectMessageChannel[]>([])
  const currentDmId = ref<string | null>(null)
  const isLoading = ref(false)

  const currentDm = computed(() =>
    dmChannels.value.find((dm) => dm.id === currentDmId.value) ?? null
  )

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.DM_CREATE, (data: unknown) => {
      const dm = data as DirectMessageChannel
      if (!dmChannels.value.find((d) => d.id === dm.id)) {
        dmChannels.value.unshift(dm)
      }
    })

    wsDispatcher.register(WS_EVENTS.MESSAGE_CREATE, (data: unknown) => {
      const msg = data as { channelId: string; content: string; timestamp: string }
      const dm = dmChannels.value.find((d) => d.id === msg.channelId)
      if (dm) {
        dm.lastMessage = { content: msg.content, timestamp: msg.timestamp }
        // Move to top
        dmChannels.value = [dm, ...dmChannels.value.filter((d) => d.id !== dm.id)]
      }
    })
  }
  setupWsHandlers()

  async function fetchDMChannels() {
    isLoading.value = true
    try {
      const { data } = await userApi.getDMChannels()
      dmChannels.value = data
    } finally {
      isLoading.value = false
    }
  }

  async function openDM(recipientId: string) {
    const existing = dmChannels.value.find((d) => d.recipientId === recipientId)
    if (existing) return existing

    const { data } = await userApi.createDMChannel(recipientId)
    dmChannels.value.unshift(data)
    return data
  }

  return {
    dmChannels,
    currentDmId,
    currentDm,
    isLoading,
    fetchDMChannels,
    openDM,
  }
})
