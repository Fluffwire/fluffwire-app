import api from './api'
import type { Bot, BotWithToken, BotMember, CreateBotPayload, UpdateBotPayload } from '@/types'

export const botApi = {
  // User bots
  listBots(): Promise<{ data: Bot[] }> {
    return api.get('/bots')
  },
  createBot(payload: CreateBotPayload): Promise<{ data: BotWithToken }> {
    return api.post('/bots', payload)
  },
  updateBot(botId: string, payload: UpdateBotPayload): Promise<{ data: Bot }> {
    return api.patch(`/bots/${botId}`, payload)
  },
  deleteBot(botId: string): Promise<void> {
    return api.delete(`/bots/${botId}`)
  },
  regenerateToken(botId: string): Promise<{ data: BotWithToken }> {
    return api.post(`/bots/${botId}/token`)
  },

  // Server bots
  listServerBots(serverId: string): Promise<{ data: BotMember[] }> {
    return api.get(`/servers/${serverId}/bots`)
  },
  addBotToServer(serverId: string, botId: string): Promise<void> {
    return api.post(`/servers/${serverId}/bots/${botId}`)
  },
  removeBotFromServer(serverId: string, botId: string): Promise<void> {
    return api.delete(`/servers/${serverId}/bots/${botId}`)
  },
}
