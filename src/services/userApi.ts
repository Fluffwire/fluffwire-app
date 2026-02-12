import api from './api'
import { API } from '@/constants/endpoints'
import type { User, UserSettings, DirectMessageChannel } from '@/types'

export const userApi = {
  getUser(id: string): Promise<{ data: User }> {
    return api.get(API.USERS.BY_ID(id))
  },

  updateSettings(settings: Partial<UserSettings>): Promise<{ data: UserSettings }> {
    return api.patch(API.USERS.SETTINGS, settings)
  },

  getDMChannels(): Promise<{ data: DirectMessageChannel[] }> {
    return api.get(API.DM.BASE)
  },

  createDMChannel(recipientId: string): Promise<{ data: DirectMessageChannel }> {
    return api.post(API.DM.BASE, { recipientId })
  },
}
