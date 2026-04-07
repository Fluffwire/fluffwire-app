import api from './api'
import type { BotCommand } from '@/types/command'

export const commandApi = {
  // Server member endpoints
  async listServerCommands(serverId: string): Promise<BotCommand[]> {
    const { data } = await api.get(`/servers/${serverId}/commands`)
    return data
  },

  // Server admin endpoints
  async toggleCommand(serverId: string, commandId: string, enabled: boolean): Promise<void> {
    await api.patch(`/servers/${serverId}/commands/${commandId}`, { enabled })
  }
}
