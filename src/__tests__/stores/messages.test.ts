import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMessagesStore } from '@/stores/messages'
import type { Message } from '@/types'

// Capture WS handler registrations
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
    deleteMessage: vi.fn(),
    editMessage: vi.fn(),
  },
}))

vi.mock('@/services/websocket', () => ({
  wsService: { send: vi.fn() },
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

  it('WS MESSAGE_CREATE adds message to channel', () => {
    // Store constructor calls setupWsHandlers() which registers handlers
    useMessagesStore()

    const handler = wsHandlers.get('MESSAGE_CREATE')!
    expect(handler).toBeDefined()

    handler(makeMessage('m1', 'ch1', 'Hello world'))
    const store = useMessagesStore()
    expect(store.getMessages('ch1')).toHaveLength(1)
    expect(store.getMessages('ch1')[0].content).toBe('Hello world')
  })

  it('WS MESSAGE_UPDATE updates existing message', () => {
    useMessagesStore()

    const createHandler = wsHandlers.get('MESSAGE_CREATE')!
    createHandler(makeMessage('m1', 'ch1', 'Original'))

    const updateHandler = wsHandlers.get('MESSAGE_UPDATE')!
    updateHandler(makeMessage('m1', 'ch1', 'Edited'))

    const store = useMessagesStore()
    expect(store.getMessages('ch1')[0].content).toBe('Edited')
  })

  it('WS MESSAGE_DELETE removes message from channel', () => {
    useMessagesStore()

    const createHandler = wsHandlers.get('MESSAGE_CREATE')!
    createHandler(makeMessage('m1', 'ch1', 'First'))
    createHandler(makeMessage('m2', 'ch1', 'Second'))

    const store = useMessagesStore()
    expect(store.getMessages('ch1')).toHaveLength(2)

    const deleteHandler = wsHandlers.get('MESSAGE_DELETE')!
    deleteHandler({ id: 'm1', channelId: 'ch1' })

    expect(store.getMessages('ch1')).toHaveLength(1)
    expect(store.getMessages('ch1')[0].id).toBe('m2')
  })

  it('messages are separated by channel', () => {
    useMessagesStore()

    const handler = wsHandlers.get('MESSAGE_CREATE')!
    handler(makeMessage('m1', 'ch1', 'In channel 1'))
    handler(makeMessage('m2', 'ch2', 'In channel 2'))

    const store = useMessagesStore()
    expect(store.getMessages('ch1')).toHaveLength(1)
    expect(store.getMessages('ch2')).toHaveLength(1)
    expect(store.getMessages('ch1')[0].content).toBe('In channel 1')
    expect(store.getMessages('ch2')[0].content).toBe('In channel 2')
  })
})
