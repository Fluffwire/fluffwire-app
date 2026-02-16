import api from './api'
import type { ChannelAccessMode } from '@/types/message'

export const channelAccessApi = {
  async updateAccessControl(
    channelId: string,
    accessMode: ChannelAccessMode,
    allowedUserIds: string[],
    allowedLabelIds: string[]
  ) {
    const { data } = await api.put(`/channels/${channelId}/access`, {
      accessMode,
      allowedUserIds,
      allowedLabelIds,
    })
    return data
  },

  async setMaxParticipants(channelId: string, maxParticipants: number | null) {
    const { data } = await api.put(`/channels/${channelId}/max-participants`, { maxParticipants })
    return data
  },

  async setUploadsEnabled(channelId: string, uploadsEnabled: boolean) {
    const { data } = await api.put(`/channels/${channelId}/uploads`, { uploadsEnabled })
    return data
  },
}
