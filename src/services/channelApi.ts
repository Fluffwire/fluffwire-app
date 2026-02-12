import api from './api'
import { API } from '@/constants/endpoints'
import type { Channel, ChannelCategory, CreateChannelPayload } from '@/types'

export interface ChannelPositionPayload {
  id: string
  position: number
  categoryId: string | null
}

export interface CategoryPositionPayload {
  id: string
  position: number
}

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

  // Category CRUD
  createCategory(serverId: string, name: string): Promise<{ data: ChannelCategory }> {
    return api.post(API.CATEGORIES.BY_SERVER(serverId), { name })
  },

  updateCategory(serverId: string, categoryId: string, name: string): Promise<{ data: ChannelCategory }> {
    return api.patch(API.CATEGORIES.BY_ID(serverId, categoryId), { name })
  },

  deleteCategory(serverId: string, categoryId: string): Promise<void> {
    return api.delete(API.CATEGORIES.BY_ID(serverId, categoryId))
  },

  // Reorder
  reorderChannels(serverId: string, positions: ChannelPositionPayload[]): Promise<{ data: { channels: Channel[]; categories: ChannelCategory[] } }> {
    return api.put(API.CHANNELS.REORDER(serverId), { positions })
  },

  reorderCategories(serverId: string, positions: CategoryPositionPayload[]): Promise<{ data: { channels: Channel[]; categories: ChannelCategory[] } }> {
    return api.put(API.CATEGORIES.REORDER(serverId), { positions })
  },
}
