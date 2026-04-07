import api from './api'
import type { BotCommand } from '@/types/command'

export const commandApi = {
  // Bot owner endpoints
  async registerCommand(botId: string, command: Partial<BotCommand>): Promise<BotCommand> {
    const { data } = await api.post(`/bots/${botId}/commands`, command)
    return data
  },

  async updateCommand(botId: string, commandId: string, updates: Partial<BotCommand>): Promise<BotCommand> {
    const { data } = await api.patch(`/bots/${botId}/commands/${commandId}`, updates)
    return data
  },

  async deleteCommand(botId: string, commandId: string, serverId: string): Promise<void> {
    await api.delete(`/bots/${botId}/commands/${commandId}?serverId=${serverId}`)
  },

  async listBotCommands(botId: string, serverId: string): Promise<BotCommand[]> {
    const { data } = await api.get(`/bots/${botId}/commands?serverId=${serverId}`)
    return data
  },

  // Server member endpoints
  async listServerCommands(serverId: string): Promise<BotCommand[]> {
    const { data} = await api.get(`/servers/${serverId}/commands`)
    return data
  },

  // Server admin endpoints
  async toggleCommand(serverId: string, commandId: string, enabled: boolean): Promise<void> {
    await api.patch(`/servers/${serverId}/commands/${commandId}`, { enabled })
  }
}
