import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/constants/endpoints', () => ({
  API: {
    FRIENDS: {
      BASE: '/friends',
      REQUESTS: '/friends/requests',
      ACCEPT: (id: string) => `/friends/requests/${id}/accept`,
      REJECT: (id: string) => `/friends/requests/${id}/reject`,
      BY_ID: (id: string) => `/friends/${id}`,
    },
  },
}))

describe('friendApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getFriends calls GET /friends', async () => {
    const api = (await import('@/services/api')).default
    const { friendApi } = await import('@/services/friendApi')
    await friendApi.getFriends()
    expect(api.get).toHaveBeenCalledWith('/friends')
  })

  it('getRequests calls GET /friends/requests', async () => {
    const api = (await import('@/services/api')).default
    const { friendApi } = await import('@/services/friendApi')
    await friendApi.getRequests()
    expect(api.get).toHaveBeenCalledWith('/friends/requests')
  })

  it('sendRequest calls POST /friends/requests', async () => {
    const api = (await import('@/services/api')).default
    const { friendApi } = await import('@/services/friendApi')
    await friendApi.sendRequest('alice')
    expect(api.post).toHaveBeenCalledWith('/friends/requests', { username: 'alice' })
  })

  it('acceptRequest calls POST /friends/requests/:id/accept', async () => {
    const api = (await import('@/services/api')).default
    const { friendApi } = await import('@/services/friendApi')
    await friendApi.acceptRequest('req1')
    expect(api.post).toHaveBeenCalledWith('/friends/requests/req1/accept')
  })

  it('rejectRequest calls POST /friends/requests/:id/reject', async () => {
    const api = (await import('@/services/api')).default
    const { friendApi } = await import('@/services/friendApi')
    await friendApi.rejectRequest('req1')
    expect(api.post).toHaveBeenCalledWith('/friends/requests/req1/reject')
  })

  it('removeFriend calls DELETE /friends/:id', async () => {
    const api = (await import('@/services/api')).default
    const { friendApi } = await import('@/services/friendApi')
    await friendApi.removeFriend('u1')
    expect(api.delete).toHaveBeenCalledWith('/friends/u1')
  })
})
