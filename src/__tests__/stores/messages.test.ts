import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMessagesStore } from '@/stores/messages'
import type { Message } from '@/types'

const wsHandlers = new Map<string, (data: unknown) => void>()
vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    MESSAGE_CREATE: 'MESSAGE_CREATE',
    MESSAGE_UPDATE: 'MESSAGE_UPDATE',
    MESSAGE_DELETE: 'MESSAGE_DELETE',
    MESSAGE_PIN: 'MESSAGE_PIN',
    MESSAGE_UNPIN: 'MESSAGE_UNPIN',
    MESSAGE_REACTION_UPDATE: 'MESSAGE_REACTION_UPDATE',
  },
}))

vi.mock('@/services/messageApi', () => ({
  messageApi: {
    getMessages: vi.fn(),
    getMessagesAround: vi.fn(),
    createMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    getPinnedMessages: vi.fn(),
    toggleReaction: vi.fn(),
    pinMessage: vi.fn(),
    unpinMessage: vi.fn(),
  },
}))

vi.mock('@/services/websocket', () => ({
  wsService: { send: vi.fn(), sendDispatch: vi.fn() },
}))

vi.mock('@/stores/directMessages', () => ({
  useDirectMessagesStore: () => ({ dmChannels: [] }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'me' } }),
}))

vi.mock('@/services/desktopNotifications', () => ({
  desktopNotifications: { show: vi.fn() },
}))

function makeMessage(id: string, channelId: string, content = 'hello'): Message {
  return {
    id,
    channelId,
    content,
    author: { id: 'u1', username: 'test', displayName: 'Test', avatar: null },
    attachments: [],
    reactions: [],
    timestamp: new Date().toISOString(),
    editedAt: null,
    pinned: false,
  }
}

describe('messages store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts with empty messages', () => {
    const store = useMessagesStore()
    expect(store.getMessages('ch1')).toEqual([])
  })

  // WS handlers
  it('WS MESSAGE_CREATE adds message to channel', () => {
    useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1', 'Hello world'))
    expect(useMessagesStore().getMessages('ch1')[0].content).toBe('Hello world')
  })

  it('WS MESSAGE_UPDATE updates existing message', () => {
    useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1', 'Original'))
    wsHandlers.get('MESSAGE_UPDATE')!(makeMessage('m1', 'ch1', 'Edited'))
    expect(useMessagesStore().getMessages('ch1')[0].content).toBe('Edited')
  })

  it('WS MESSAGE_DELETE removes message from channel', () => {
    useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1'))
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m2', 'ch1'))
    wsHandlers.get('MESSAGE_DELETE')!({ id: 'm1', channelId: 'ch1' })
    const msgs = useMessagesStore().getMessages('ch1')
    expect(msgs).toHaveLength(1)
    expect(msgs[0].id).toBe('m2')
  })

  it('messages are separated by channel', () => {
    useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1'))
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m2', 'ch2'))
    const store = useMessagesStore()
    expect(store.getMessages('ch1')).toHaveLength(1)
    expect(store.getMessages('ch2')).toHaveLength(1)
  })

  it('WS MESSAGE_PIN marks message pinned in channel list', () => {
    useMessagesStore()
    const store = useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1'))
    wsHandlers.get('MESSAGE_PIN')!({ ...makeMessage('m1', 'ch1'), pinned: true })
    expect(store.getMessages('ch1')[0].pinned).toBe(true)
  })

  it('WS MESSAGE_PIN also updates pre-populated pinned cache', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getPinnedMessages).mockResolvedValueOnce({ data: [] } as never)

    useMessagesStore()
    const store = useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1'))
    await store.fetchPinnedMessages('ch1') // populate cache (empty)
    wsHandlers.get('MESSAGE_PIN')!({ ...makeMessage('m1', 'ch1'), pinned: true })
    expect(store.getPinnedMessages('ch1')).toHaveLength(1)
  })

  it('WS MESSAGE_UNPIN marks message unpinned and removes from pinned cache', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getPinnedMessages).mockResolvedValueOnce({ data: [makeMessage('m1', 'ch1')] } as never)

    useMessagesStore()
    const store = useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1'))
    await store.fetchPinnedMessages('ch1')
    wsHandlers.get('MESSAGE_UNPIN')!({ ...makeMessage('m1', 'ch1'), pinned: false })
    expect(store.getMessages('ch1')[0].pinned).toBe(false)
    expect(store.getPinnedMessages('ch1')).toHaveLength(0)
  })

  it('WS MESSAGE_REACTION_UPDATE updates message reactions', () => {
    useMessagesStore()
    const store = useMessagesStore()
    wsHandlers.get('MESSAGE_CREATE')!(makeMessage('m1', 'ch1'))
    const reactions = [{ emoji: '👍', count: 2, userIds: ['u1', 'u2'] }]
    wsHandlers.get('MESSAGE_REACTION_UPDATE')!({ messageId: 'm1', channelId: 'ch1', reactions })
    expect(store.getMessages('ch1')[0].reactions).toEqual(reactions)
  })

  // Fetch
  it('fetchMessages loads messages into channel', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getMessages).mockResolvedValueOnce({
      data: { messages: [makeMessage('m1', 'ch1'), makeMessage('m2', 'ch1')], cursor: null, hasMore: false },
    } as never)

    const store = useMessagesStore()
    await store.fetchMessages('ch1')
    expect(store.getMessages('ch1')).toHaveLength(2)
    expect(store.isLoading).toBe(false)
  })

  it('fetchMessages with loadMore prepends older messages', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getMessages)
      .mockResolvedValueOnce({ data: { messages: [makeMessage('m3', 'ch1'), makeMessage('m4', 'ch1')], cursor: 'c1', hasMore: true } } as never)
      .mockResolvedValueOnce({ data: { messages: [makeMessage('m1', 'ch1'), makeMessage('m2', 'ch1')], cursor: null, hasMore: false } } as never)

    const store = useMessagesStore()
    await store.fetchMessages('ch1')           // initial
    await store.fetchMessages('ch1', true)     // load more
    expect(store.getMessages('ch1')).toHaveLength(4)
    expect(store.getMessages('ch1')[0].id).toBe('m1') // older prepended
  })

  it('fetchMessagesAround loads messages and returns found flag', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getMessagesAround).mockResolvedValueOnce({
      data: { messages: [makeMessage('m1', 'ch1'), makeMessage('m2', 'ch1')], cursor: null, hasMore: false },
    } as never)

    const store = useMessagesStore()
    const found = await store.fetchMessagesAround('ch1', 'm1')
    expect(found).toBe(true)
    expect(store.getMessages('ch1')).toHaveLength(2)
  })

  it('fetchMessagesAround returns false when target not in results', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getMessagesAround).mockResolvedValueOnce({
      data: { messages: [makeMessage('m2', 'ch1')], cursor: null, hasMore: false },
    } as never)

    const store = useMessagesStore()
    const found = await store.fetchMessagesAround('ch1', 'missing')
    expect(found).toBe(false)
  })

  // Reply
  it('setReplyTo and getReplyTo', () => {
    const store = useMessagesStore()
    const msg = makeMessage('m1', 'ch1')
    store.setReplyTo('ch1', msg)
    expect(store.getReplyTo('ch1')).toEqual(msg)
  })

  it('clearReply removes reply', () => {
    const store = useMessagesStore()
    store.setReplyTo('ch1', makeMessage('m1', 'ch1'))
    store.clearReply('ch1')
    expect(store.getReplyTo('ch1')).toBeUndefined()
  })

  it('sendMessage dispatches via WS and includes replyToId if set', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = useMessagesStore()
    store.setReplyTo('ch1', makeMessage('m1', 'ch1'))
    store.sendMessage({ channelId: 'ch1', content: 'reply!' })
    expect(wsService.sendDispatch).toHaveBeenCalledWith('MESSAGE_CREATE', expect.objectContaining({ replyToId: 'm1' }))
    expect(store.getReplyTo('ch1')).toBeUndefined() // reply cleared
  })

  it('editMessage calls API', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.editMessage).mockResolvedValueOnce(undefined as never)

    const store = useMessagesStore()
    await store.editMessage('ch1', 'm1', 'new content')
    expect(messageApi.editMessage).toHaveBeenCalledWith('ch1', 'm1', { content: 'new content' })
  })

  it('deleteMessage calls API', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.deleteMessage).mockResolvedValueOnce(undefined as never)

    const store = useMessagesStore()
    await store.deleteMessage('ch1', 'm1')
    expect(messageApi.deleteMessage).toHaveBeenCalledWith('ch1', 'm1')
  })

  it('clearChannel removes channel messages and cursor', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getMessages).mockResolvedValueOnce({
      data: { messages: [makeMessage('m1', 'ch1')], cursor: 'c1', hasMore: false },
    } as never)

    const store = useMessagesStore()
    await store.fetchMessages('ch1')
    expect(store.getMessages('ch1')).toHaveLength(1)

    store.clearChannel('ch1')
    expect(store.getMessages('ch1')).toHaveLength(0)
    expect(store.channelHasMore('ch1')).toBe(true) // defaults to true when unknown
  })

  it('fetchPinnedMessages loads and caches pinned messages', async () => {
    const { messageApi } = await import('@/services/messageApi')
    vi.mocked(messageApi.getPinnedMessages).mockResolvedValueOnce({
      data: [makeMessage('m1', 'ch1'), makeMessage('m2', 'ch1')],
    } as never)

    const store = useMessagesStore()
    await store.fetchPinnedMessages('ch1')
    expect(store.getPinnedMessages('ch1')).toHaveLength(2)
  })
})
