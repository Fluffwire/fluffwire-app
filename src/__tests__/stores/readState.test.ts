import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReadStateStore } from '@/stores/readState'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    MESSAGE_CREATE: 'MESSAGE_CREATE',
  },
}))

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/constants/endpoints', () => ({
  API: {
    CHANNELS: {
      ACK: (id: string) => `/channels/${id}/ack`,
    },
  },
}))

describe('readState store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts with no unread channels', () => {
    const store = useReadStateStore()
    expect(store.unreadChannels.size).toBe(0)
  })

  it('isUnread returns false for unknown channel', () => {
    const store = useReadStateStore()
    expect(store.isUnread('ch1')).toBe(false)
  })

  it('setReadStates marks channels as read', () => {
    useReadStateStore()
    const store = useReadStateStore()
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm5' }])
    expect(store.isUnread('ch1')).toBe(false)
  })

  it('isUnread returns true when new message arrives after last read', () => {
    useReadStateStore()
    const store = useReadStateStore()
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm3' }])

    // New message with higher id
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm5', channelId: 'ch1', content: 'hi', timestamp: '' })
    expect(store.isUnread('ch1')).toBe(true)
  })

  it('isUnread returns false when message id equals last read', () => {
    useReadStateStore()
    const store = useReadStateStore()
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm5' }])
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm5', channelId: 'ch1', content: 'hi', timestamp: '' })
    expect(store.isUnread('ch1')).toBe(false)
  })

  it('hasUnreadInServer returns true when server has unread channel', () => {
    useReadStateStore()
    const store = useReadStateStore()
    store.registerChannelServer('ch1', 's1')
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm1' }])
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm2', channelId: 'ch1', content: 'hi', timestamp: '' })
    expect(store.hasUnreadInServer('s1')).toBe(true)
    expect(store.hasUnreadInServer('s2')).toBe(false)
  })

  it('hasUnreadDMs returns true for unread channel not in a server', () => {
    useReadStateStore()
    const store = useReadStateStore()
    // ch-dm not registered to any server
    store.setReadStates([{ userId: 'u1', channelId: 'ch-dm', lastMessageId: 'm1' }])
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm2', channelId: 'ch-dm', content: 'hey', timestamp: '' })
    expect(store.hasUnreadDMs()).toBe(true)
  })

  it('hasUnreadDMs returns false when unread channels all belong to servers', () => {
    useReadStateStore()
    const store = useReadStateStore()
    store.registerChannelServer('ch1', 's1')
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm1' }])
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm2', channelId: 'ch1', content: 'hi', timestamp: '' })
    expect(store.hasUnreadDMs()).toBe(false)
  })

  it('markAsRead posts to API and clears unread', async () => {
    const api = await import('@/services/api')
    useReadStateStore()
    const store = useReadStateStore()
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm1' }])
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm2', channelId: 'ch1', content: 'hi', timestamp: '' })

    await store.markAsRead('ch1')
    expect(api.default.post).toHaveBeenCalledWith('/channels/ch1/ack', { messageId: 'm2' })
    expect(store.isUnread('ch1')).toBe(false)
  })

  it('markAsRead does nothing when already read', async () => {
    const api = await import('@/services/api')
    useReadStateStore()
    const store = useReadStateStore()
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm5' }])
    // No new message — already up-to-date
    await store.markAsRead('ch1')
    expect(api.default.post).not.toHaveBeenCalled()
  })

  it('markAsRead reverts on API failure', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.post).mockRejectedValueOnce(new Error('network error'))

    useReadStateStore()
    const store = useReadStateStore()
    store.setReadStates([{ userId: 'u1', channelId: 'ch1', lastMessageId: 'm1' }])
    wsHandlers.get('MESSAGE_CREATE')!({ id: 'm2', channelId: 'ch1', content: 'hi', timestamp: '' })

    await store.markAsRead('ch1')
    // Should have reverted to m1
    expect(store.readStates.get('ch1')).toBe('m1')
  })
})
