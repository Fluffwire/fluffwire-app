import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Bot, BotWithToken, CreateBotPayload, UpdateBotPayload } from '@/types'
import { botApi } from '@/services/botApi'

export const useBotsStore = defineStore('bots', () => {
  const userBots = ref<Bot[]>([])
  const isLoading = ref(false)

  async function fetchUserBots() {
    isLoading.value = true
    try {
      const { data } = await botApi.listBots()
      userBots.value = data
    } finally {
      isLoading.value = false
    }
  }

  async function createBot(payload: CreateBotPayload): Promise<BotWithToken> {
    const { data } = await botApi.createBot(payload)
    userBots.value.push(data)
    return data  // Includes token
  }

  async function updateBot(botId: string, payload: UpdateBotPayload) {
    const { data } = await botApi.updateBot(botId, payload)
    const idx = userBots.value.findIndex(b => b.id === botId)
    if (idx !== -1) userBots.value[idx] = data
  }

  async function deleteBot(botId: string) {
    await botApi.deleteBot(botId)
    userBots.value = userBots.value.filter(b => b.id !== botId)
  }

  async function regenerateToken(botId: string): Promise<string> {
    const { data } = await botApi.regenerateToken(botId)
    const idx = userBots.value.findIndex(b => b.id === botId)
    if (idx !== -1) userBots.value[idx] = data
    return data.token  // Return new token
  }

  return {
    userBots,
    isLoading,
    fetchUserBots,
    createBot,
    updateBot,
    deleteBot,
    regenerateToken,
  }
})
