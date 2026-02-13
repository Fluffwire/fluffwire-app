import api from './api'
import { API } from '@/constants/endpoints'
import type { Server, ServerMember, CreateServerPayload, JoinServerPayload, ServerInvite, Webhook } from '@/types'

export const serverApi = {
  getServers(): Promise<{ data: Server[] }> {
    return api.get(API.SERVERS.BASE)
  },

  getServer(id: string): Promise<{ data: Server }> {
    return api.get(API.SERVERS.BY_ID(id))
  },

  createServer(payload: CreateServerPayload): Promise<{ data: Server }> {
    return api.post(API.SERVERS.BASE, payload)
  },

  updateServer(id: string, payload: Partial<CreateServerPayload>): Promise<{ data: Server }> {
    return api.patch(API.SERVERS.BY_ID(id), payload)
  },

  deleteServer(id: string): Promise<void> {
    return api.delete(API.SERVERS.BY_ID(id))
  },

  joinServer(payload: JoinServerPayload): Promise<{ data: Server }> {
    return api.post(API.SERVERS.JOIN, payload)
  },

  getMembers(serverId: string): Promise<{ data: ServerMember[] }> {
    return api.get(API.SERVERS.MEMBERS(serverId))
  },

  createInvite(serverId: string): Promise<{ data: ServerInvite }> {
    return api.post(API.SERVERS.INVITES(serverId))
  },

  leaveServer(id: string): Promise<void> {
    return api.delete(API.SERVERS.MEMBERS(id) + '/@me')
  },

  kickMember(serverId: string, userId: string): Promise<void> {
    return api.delete(API.SERVERS.KICK(serverId, userId))
  },

  banMember(serverId: string, userId: string, reason = ''): Promise<void> {
    return api.post(API.SERVERS.BANS(serverId), { userId, reason })
  },

  unbanMember(serverId: string, userId: string): Promise<void> {
    return api.delete(API.SERVERS.UNBAN(serverId, userId))
  },

  listBans(serverId: string): Promise<{ data: { userId: string; username: string; bannedBy: string; reason: string; createdAt: string }[] }> {
    return api.get(API.SERVERS.BANS(serverId))
  },

  listWebhooks(serverId: string): Promise<{ data: Webhook[] }> {
    return api.get(API.SERVERS.WEBHOOKS(serverId))
  },

  createWebhook(serverId: string, name: string, channelId: string): Promise<{ data: Webhook }> {
    return api.post(API.SERVERS.WEBHOOKS(serverId), { name, channelId })
  },

  deleteWebhook(serverId: string, webhookId: string): Promise<void> {
    return api.delete(API.SERVERS.WEBHOOK(serverId, webhookId))
  },
}
