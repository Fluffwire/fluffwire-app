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
    CHANNELS: {
      BY_SERVER: (id: string) => `/channels/server/${id}`,
      BY_ID: (id: string) => `/channels/${id}`,
      REORDER: (id: string) => `/channels/server/${id}/reorder`,
    },
    CATEGORIES: {
      BY_SERVER: (id: string) => `/categories/server/${id}`,
      BY_ID: (sid: string, cid: string) => `/categories/${sid}/${cid}`,
      REORDER: (id: string) => `/categories/server/${id}/reorder`,
    },
  },
}))

describe('channelApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getChannels calls GET for server', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.getChannels('s1')
    expect(api.get).toHaveBeenCalledWith('/channels/server/s1')
  })

  it('createChannel calls POST for server', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.createChannel('s1', { name: 'general', type: 'text' })
    expect(api.post).toHaveBeenCalledWith('/channels/server/s1', { name: 'general', type: 'text' })
  })

  it('updateChannel calls PATCH', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.updateChannel('ch1', { name: 'renamed' })
    expect(api.patch).toHaveBeenCalledWith('/channels/ch1', { name: 'renamed' })
  })

  it('deleteChannel calls DELETE', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.deleteChannel('ch1')
    expect(api.delete).toHaveBeenCalledWith('/channels/ch1')
  })

  it('createCategory calls POST', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.createCategory('s1', 'General')
    expect(api.post).toHaveBeenCalledWith('/categories/server/s1', { name: 'General' })
  })

  it('updateCategory calls PATCH', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.updateCategory('s1', 'cat1', 'Renamed')
    expect(api.patch).toHaveBeenCalledWith('/categories/s1/cat1', { name: 'Renamed' })
  })

  it('deleteCategory calls DELETE', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    await channelApi.deleteCategory('s1', 'cat1')
    expect(api.delete).toHaveBeenCalledWith('/categories/s1/cat1')
  })

  it('reorderChannels calls PUT with positions', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    const positions = [{ id: 'ch1', position: 0, categoryId: null }]
    await channelApi.reorderChannels('s1', positions)
    expect(api.put).toHaveBeenCalledWith('/channels/server/s1/reorder', { positions })
  })

  it('reorderCategories calls PUT with positions', async () => {
    const api = (await import('@/services/api')).default
    const { channelApi } = await import('@/services/channelApi')
    const positions = [{ id: 'cat1', position: 0 }]
    await channelApi.reorderCategories('s1', positions)
    expect(api.put).toHaveBeenCalledWith('/categories/server/s1/reorder', { positions })
  })
})
