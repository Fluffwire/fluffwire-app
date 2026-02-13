import api from './api'
import { API } from '@/constants/endpoints'
import type { Server, ServerMember, CreateServerPayload, JoinServerPayload, ServerInvite, Webhook, Role } from '@/types'

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

  getInvites(serverId: string): Promise<{ data: ServerInvite[] }> {
    return api.get(API.SERVERS.INVITES(serverId))
  },

  deleteInvite(serverId: string, code: string): Promise<void> {
    return api.delete(API.SERVERS.INVITE(serverId, code))
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

  updateWebhook(serverId: string, webhookId: string, data: { name?: string; channelId?: string }): Promise<{ data: Webhook }> {
    return api.patch(API.SERVERS.WEBHOOK(serverId, webhookId), data)
  },

  deleteWebhook(serverId: string, webhookId: string): Promise<void> {
    return api.delete(API.SERVERS.WEBHOOK(serverId, webhookId))
  },

  async updateMemberPrivacy(serverId: string, allowDMs: boolean, showProfile: boolean) {
    const { data } = await api.patch(`${API.SERVERS.BASE}/${serverId}/members/@me/privacy`, {
      allowDMs,
      showProfile,
    })
    return data
  },

  async getRoles(serverId: string): Promise<Role[]> {
    const { data } = await api.get(`${API.SERVERS.BASE}/${serverId}/roles`)
    return data
  },

  async createRole(serverId: string, name: string, color?: string, permissions?: number): Promise<Role> {
    const { data } = await api.post(`${API.SERVERS.BASE}/${serverId}/roles`, { name, color, permissions })
    return data as Role
  },

  async updateRole(serverId: string, roleId: string, updates: { name?: string; color?: string; permissions?: number }): Promise<Role> {
    const { data } = await api.patch(`${API.SERVERS.BASE}/${serverId}/roles/${roleId}`, updates)
    return data as Role
  },

  async deleteRole(serverId: string, roleId: string): Promise<void> {
    await api.delete(`${API.SERVERS.BASE}/${serverId}/roles/${roleId}`)
  },

  async reorderRoles(serverId: string, roleIds: string[]): Promise<void> {
    await api.put(`${API.SERVERS.BASE}/${serverId}/roles/reorder`, { roleIds })
  },

  async assignMemberRoles(serverId: string, memberId: string, roleIds: string[]) {
    const { data } = await api.put(`${API.SERVERS.BASE}/${serverId}/members/${memberId}/roles`, { roleIds })
    return data
  },
}
