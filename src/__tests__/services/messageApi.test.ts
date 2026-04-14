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
      MESSAGES: (id: string) => `/channels/${id}/messages`,
      MESSAGE_BY_ID: (cid: string, mid: string) => `/channels/${cid}/messages/${mid}`,
      TYPING: (id: string) => `/channels/${id}/typing`,
      PIN: (cid: string, mid: string) => `/channels/${cid}/pins/${mid}`,
      PINS: (id: string) => `/channels/${id}/pins`,
      REACTION: (cid: string, mid: string, emoji: string) => `/channels/${cid}/messages/${mid}/reactions/${emoji}`,
      SEARCH: (id: string) => `/channels/${id}/messages/search`,
    },
  },
}))

describe('messageApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getMessages calls GET with default params', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.getMessages('ch1')
    expect(api.get).toHaveBeenCalledWith('/channels/ch1/messages', { params: { limit: 50 } })
  })

  it('getMessages includes cursor when provided', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.getMessages('ch1', 'cursor123')
    expect(api.get).toHaveBeenCalledWith('/channels/ch1/messages', { params: { limit: 50, cursor: 'cursor123' } })
  })

  it('getMessagesAround calls GET with around param', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.getMessagesAround('ch1', 'm1')
    expect(api.get).toHaveBeenCalledWith('/channels/ch1/messages', { params: { around: 'm1', limit: 50 } })
  })

  it('createMessage calls POST', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.createMessage('ch1', 'hello')
    expect(api.post).toHaveBeenCalledWith('/channels/ch1/messages', {
      content: 'hello',
      attachments: undefined,
      replyToId: undefined,
    })
  })

  it('editMessage calls PATCH', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.editMessage('ch1', 'm1', { content: 'edited' })
    expect(api.patch).toHaveBeenCalledWith('/channels/ch1/messages/m1', { content: 'edited' })
  })

  it('deleteMessage calls DELETE', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.deleteMessage('ch1', 'm1')
    expect(api.delete).toHaveBeenCalledWith('/channels/ch1/messages/m1')
  })

  it('sendTyping calls POST typing endpoint', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.sendTyping('ch1')
    expect(api.post).toHaveBeenCalledWith('/channels/ch1/typing')
  })

  it('pinMessage calls PUT pins endpoint', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.pinMessage('ch1', 'm1')
    expect(api.put).toHaveBeenCalledWith('/channels/ch1/pins/m1')
  })

  it('unpinMessage calls DELETE pins endpoint', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.unpinMessage('ch1', 'm1')
    expect(api.delete).toHaveBeenCalledWith('/channels/ch1/pins/m1')
  })

  it('getPinnedMessages calls GET pins', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.getPinnedMessages('ch1')
    expect(api.get).toHaveBeenCalledWith('/channels/ch1/pins')
  })

  it('toggleReaction calls PUT reaction endpoint', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.toggleReaction('ch1', 'm1', '👍')
    expect(api.put).toHaveBeenCalledWith('/channels/ch1/messages/m1/reactions/👍')
  })

  it('searchMessages calls GET search endpoint', async () => {
    const api = (await import('@/services/api')).default
    const { messageApi } = await import('@/services/messageApi')
    await messageApi.searchMessages('ch1', { q: 'hello' })
    expect(api.get).toHaveBeenCalledWith('/channels/ch1/messages/search', { params: { q: 'hello' } })
  })
})
