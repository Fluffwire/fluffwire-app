import api from './api'
import { API } from '@/constants/endpoints'
import type { Channel, ChannelCategory, CreateChannelPayload } from '@/types'

export const channelApi = {
  getChannels(serverId: string): Promise<{ data: { channels: Channel[]; categories: ChannelCategory[] } }> {
    return api.get(API.CHANNELS.BY_SERVER(serverId))
  },

  createChannel(serverId: string, payload: CreateChannelPayload): Promise<{ data: Channel }> {
    return api.post(API.CHANNELS.BY_SERVER(serverId), payload)
  },

  updateChannel(channelId: string, payload: Partial<CreateChannelPayload>): Promise<{ data: Channel }> {
    return api.patch(API.CHANNELS.BY_ID(channelId), payload)
  },

  deleteChannel(channelId: string): Promise<void> {
    return api.delete(API.CHANNELS.BY_ID(channelId))
  },
}
