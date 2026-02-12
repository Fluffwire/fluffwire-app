import api from './api'
import { API } from '@/constants/endpoints'
import type { Server, ServerMember, CreateServerPayload, JoinServerPayload, ServerInvite } from '@/types'

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
}
