import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/constants/endpoints', () => ({
  API: {
    SERVERS: {
      BASE: '/servers',
      BY_ID: (id: string) => `/servers/${id}`,
      JOIN: '/servers/join',
      MEMBERS: (id: string) => `/servers/${id}/members`,
      INVITES: (id: string) => `/servers/${id}/invites`,
      INVITE: (id: string, code: string) => `/servers/${id}/invites/${code}`,
      KICK: (id: string, uid: string) => `/servers/${id}/kick/${uid}`,
      BANS: (id: string) => `/servers/${id}/bans`,
      UNBAN: (id: string, uid: string) => `/servers/${id}/bans/${uid}`,
      WEBHOOKS: (id: string) => `/servers/${id}/webhooks`,
      WEBHOOK: (id: string, wid: string) => `/servers/${id}/webhooks/${wid}`,
    },
  },
}))

describe('serverApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getServers calls GET /servers', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.getServers()
    expect(api.get).toHaveBeenCalledWith('/servers')
  })

  it('getServer calls GET /servers/:id', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.getServer('s1')
    expect(api.get).toHaveBeenCalledWith('/servers/s1')
  })

  it('createServer calls POST /servers', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.createServer({ name: 'Test' })
    expect(api.post).toHaveBeenCalledWith('/servers', { name: 'Test' })
  })

  it('updateServer calls PATCH /servers/:id', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.updateServer('s1', { name: 'Renamed' })
    expect(api.patch).toHaveBeenCalledWith('/servers/s1', { name: 'Renamed' })
  })

  it('deleteServer calls DELETE /servers/:id', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.deleteServer('s1')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1')
  })

  it('joinServer calls POST /servers/join', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.joinServer({ inviteCode: 'abc123' })
    expect(api.post).toHaveBeenCalledWith('/servers/join', { inviteCode: 'abc123' })
  })

  it('getMembers calls GET /servers/:id/members', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.getMembers('s1')
    expect(api.get).toHaveBeenCalledWith('/servers/s1/members')
  })

  it('createInvite calls POST /servers/:id/invites', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.createInvite('s1', { maxUses: 10 })
    expect(api.post).toHaveBeenCalledWith('/servers/s1/invites', { maxUses: 10 })
  })

  it('getInvites calls GET /servers/:id/invites', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.getInvites('s1')
    expect(api.get).toHaveBeenCalledWith('/servers/s1/invites')
  })

  it('deleteInvite calls DELETE /servers/:id/invites/:code', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.deleteInvite('s1', 'code123')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1/invites/code123')
  })

  it('leaveServer calls DELETE /servers/:id/members/@me', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.leaveServer('s1')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1/members/@me')
  })

  it('kickMember calls DELETE /servers/:id/kick/:uid', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.kickMember('s1', 'u1')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1/kick/u1')
  })

  it('banMember calls POST /servers/:id/bans', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.banMember('s1', 'u1', 'spamming')
    expect(api.post).toHaveBeenCalledWith('/servers/s1/bans', { userId: 'u1', reason: 'spamming' })
  })

  it('unbanMember calls DELETE /servers/:id/bans/:uid', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.unbanMember('s1', 'u1')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1/bans/u1')
  })

  it('listBans calls GET /servers/:id/bans', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.listBans('s1')
    expect(api.get).toHaveBeenCalledWith('/servers/s1/bans')
  })

  it('listWebhooks calls GET /servers/:id/webhooks', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.listWebhooks('s1')
    expect(api.get).toHaveBeenCalledWith('/servers/s1/webhooks')
  })

  it('createWebhook calls POST /servers/:id/webhooks', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.createWebhook('s1', 'my-hook', 'ch1')
    expect(api.post).toHaveBeenCalledWith('/servers/s1/webhooks', { name: 'my-hook', channelId: 'ch1' })
  })

  it('deleteWebhook calls DELETE /servers/:id/webhooks/:wid', async () => {
    const api = (await import('@/services/api')).default
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.deleteWebhook('s1', 'w1')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1/webhooks/w1')
  })

  it('updateMemberPrivacy calls PATCH members/@me/privacy', async () => {
    const api = (await import('@/services/api')).default
    vi.mocked(api.patch).mockResolvedValueOnce({ data: {} } as never)
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.updateMemberPrivacy('s1', true, false)
    expect(api.patch).toHaveBeenCalledWith(
      '/servers/s1/members/@me/privacy',
      { allowDMs: true, showProfile: false }
    )
  })

  it('getLabels calls GET /servers/:id/labels', async () => {
    const api = (await import('@/services/api')).default
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] } as never)
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.getLabels('s1')
    expect(api.get).toHaveBeenCalledWith('/servers/s1/labels')
  })

  it('createLabel calls POST /servers/:id/labels', async () => {
    const api = (await import('@/services/api')).default
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} } as never)
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.createLabel('s1', 'Admin', '#ff0000')
    expect(api.post).toHaveBeenCalledWith('/servers/s1/labels', { name: 'Admin', color: '#ff0000' })
  })

  it('deleteLabel calls DELETE /servers/:id/labels/:lid', async () => {
    const api = (await import('@/services/api')).default
    vi.mocked(api.delete).mockResolvedValueOnce(undefined as never)
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.deleteLabel('s1', 'l1')
    expect(api.delete).toHaveBeenCalledWith('/servers/s1/labels/l1')
  })

  it('setMemberTier calls PUT /servers/:id/members/:mid/tier', async () => {
    const api = (await import('@/services/api')).default
    vi.mocked(api.put).mockResolvedValueOnce({ data: {} } as never)
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.setMemberTier('s1', 'u1', 'admin')
    expect(api.put).toHaveBeenCalledWith('/servers/s1/members/u1/tier', { tier: 'admin' })
  })

  it('transferOwnership calls POST /servers/:id/transfer-ownership', async () => {
    const api = (await import('@/services/api')).default
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} } as never)
    const { serverApi } = await import('@/services/serverApi')
    await serverApi.transferOwnership('s1', 'u2')
    expect(api.post).toHaveBeenCalledWith('/servers/s1/transfer-ownership', { newOwnerId: 'u2' })
  })
})
