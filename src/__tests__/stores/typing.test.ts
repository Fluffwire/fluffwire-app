import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTypingStore } from '@/stores/typing'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    TYPING_START: 'TYPING_START',
    TYPING_STOP: 'TYPING_STOP',
  },
}))

vi.mock('@/services/websocket', () => ({
  wsService: { sendDispatch: vi.fn() },
}))

describe('typing store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getTypingUsers returns empty for unknown channel', () => {
    const store = useTypingStore()
    expect(store.getTypingUsers('ch1')).toEqual([])
  })

  it('getTypingText returns empty string when nobody typing', () => {
    const store = useTypingStore()
    expect(store.getTypingText('ch1')).toBe('')
  })

  it('WS TYPING_START adds user to channel', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingUsers('ch1')).toHaveLength(1)
    expect(store.getTypingUsers('ch1')[0].username).toBe('Alice')
  })

  it('getTypingText with one user', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingText('ch1')).toBe('Alice is typing...')
  })

  it('getTypingText with two users', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    wsHandlers.get('TYPING_START')!({ userId: 'u2', username: 'Bob', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingText('ch1')).toBe('Alice and Bob are typing...')
  })

  it('getTypingText with three or more users', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    wsHandlers.get('TYPING_START')!({ userId: 'u2', username: 'Bob', channelId: 'ch1' })
    wsHandlers.get('TYPING_START')!({ userId: 'u3', username: 'Carol', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingText('ch1')).toBe('Several people are typing...')
  })

  it('WS TYPING_START updates existing user (resets timeout)', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingUsers('ch1')).toHaveLength(1)
  })

  it('WS TYPING_STOP removes user from channel', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    wsHandlers.get('TYPING_STOP')!({ userId: 'u1', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingUsers('ch1')).toHaveLength(0)
  })

  it('typing auto-clears after 8 seconds for regular users', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingUsers('ch1')).toHaveLength(1)
    vi.advanceTimersByTime(8001)
    expect(store.getTypingUsers('ch1')).toHaveLength(0)
  })

  it('bot typing clears after 90 seconds', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'bot1', username: 'MyBot', channelId: 'ch1', isBot: true })
    const store = useTypingStore()
    vi.advanceTimersByTime(8001)
    expect(store.getTypingUsers('ch1')).toHaveLength(1) // still typing
    vi.advanceTimersByTime(90000)
    expect(store.getTypingUsers('ch1')).toHaveLength(0)
  })

  it('typing is per-channel (does not leak)', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    const store = useTypingStore()
    expect(store.getTypingUsers('ch2')).toHaveLength(0)
  })

  it('clearChannel removes all typing users and timeouts', () => {
    useTypingStore()
    wsHandlers.get('TYPING_START')!({ userId: 'u1', username: 'Alice', channelId: 'ch1' })
    wsHandlers.get('TYPING_START')!({ userId: 'u2', username: 'Bob', channelId: 'ch1' })
    const store = useTypingStore()
    store.clearChannel('ch1')
    expect(store.getTypingUsers('ch1')).toHaveLength(0)
  })

  it('sendTyping sends WS dispatch and throttles', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = useTypingStore()
    store.sendTyping('ch1')
    store.sendTyping('ch1') // throttled
    expect(wsService.sendDispatch).toHaveBeenCalledTimes(1)
  })

  it('sendTyping sends again after 3 seconds', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = useTypingStore()
    store.sendTyping('ch1')
    vi.advanceTimersByTime(3001)
    store.sendTyping('ch1')
    expect(wsService.sendDispatch).toHaveBeenCalledTimes(2)
  })

  it('stopTyping sends TYPING_STOP if started', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = useTypingStore()
    store.sendTyping('ch1')
    store.stopTyping('ch1')
    expect(wsService.sendDispatch).toHaveBeenCalledWith('TYPING_STOP', { channelId: 'ch1' })
  })

  it('stopTyping does nothing if never started', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = useTypingStore()
    store.stopTyping('ch1')
    expect(wsService.sendDispatch).not.toHaveBeenCalledWith('TYPING_STOP', expect.anything())
  })
})
