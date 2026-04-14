import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDirectMessagesStore } from '@/stores/directMessages'
import type { DirectMessageChannel } from '@/types'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    DM_CREATE: 'DM_CREATE',
    MESSAGE_CREATE: 'MESSAGE_CREATE',
  },
}))

vi.mock('@/services/userApi', () => ({
  userApi: {
    getDMChannels: vi.fn(),
    createDMChannel: vi.fn(),
  },
}))

function makeDM(id: string, recipientId: string): DirectMessageChannel {
  return {
    id,
    recipientId,
    recipient: { id: recipientId, username: `user-${recipientId}`, displayName: `User ${recipientId}`, avatar: null, status: 'online' },
    lastMessage: null,
  }
}

describe('directMessages store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts with empty DM list', () => {
    const store = useDirectMessagesStore()
    expect(store.dmChannels).toEqual([])
    expect(store.currentDmId).toBeNull()
    expect(store.currentDm).toBeNull()
  })

  it('currentDm returns matching DM', () => {
    const store = useDirectMessagesStore()
    store.dmChannels.push(makeDM('dm1', 'u1'), makeDM('dm2', 'u2'))
    store.currentDmId = 'dm2'
    expect(store.currentDm?.id).toBe('dm2')
  })

  it('currentDm returns null when not set', () => {
    const store = useDirectMessagesStore()
    store.dmChannels.push(makeDM('dm1', 'u1'))
    expect(store.currentDm).toBeNull()
  })

  it('fetchDMChannels loads channels from API', async () => {
    const { userApi } = await import('@/services/userApi')
    vi.mocked(userApi.getDMChannels).mockResolvedValueOnce({
      data: [makeDM('dm1', 'u1'), makeDM('dm2', 'u2')],
    } as never)

    const store = useDirectMessagesStore()
    await store.fetchDMChannels()
    expect(store.dmChannels).toHaveLength(2)
    expect(store.isLoading).toBe(false)
  })

  it('openDM returns existing DM without API call', async () => {
    const { userApi } = await import('@/services/userApi')
    const store = useDirectMessagesStore()
    store.dmChannels.push(makeDM('dm1', 'u1'))

    const result = await store.openDM('u1')
    expect(result.id).toBe('dm1')
    expect(userApi.createDMChannel).not.toHaveBeenCalled()
  })

  it('openDM creates new DM and prepends it', async () => {
    const { userApi } = await import('@/services/userApi')
    vi.mocked(userApi.createDMChannel).mockResolvedValueOnce({ data: makeDM('dm1', 'u1') } as never)

    const store = useDirectMessagesStore()
    store.dmChannels.push(makeDM('dm-existing', 'u2'))
    const result = await store.openDM('u1')
    expect(result.id).toBe('dm1')
    expect(store.dmChannels[0].id).toBe('dm1') // prepended
    expect(store.dmChannels).toHaveLength(2)
  })

  // WS handlers
  it('WS DM_CREATE prepends new DM (deduped)', () => {
    useDirectMessagesStore()
    wsHandlers.get('DM_CREATE')!(makeDM('dm1', 'u1'))
    wsHandlers.get('DM_CREATE')!(makeDM('dm1', 'u1')) // duplicate
    const store = useDirectMessagesStore()
    expect(store.dmChannels).toHaveLength(1)
  })

  it('WS MESSAGE_CREATE updates lastMessage and moves DM to top', () => {
    useDirectMessagesStore()
    const store = useDirectMessagesStore()
    store.dmChannels.push(makeDM('dm1', 'u1'), makeDM('dm2', 'u2'))
    wsHandlers.get('MESSAGE_CREATE')!({ channelId: 'dm1', content: 'Hello!', timestamp: '2024-01-01' })
    expect(store.dmChannels[0].id).toBe('dm1') // moved to top
    expect(store.dmChannels[0].lastMessage?.content).toBe('Hello!')
  })

  it('WS MESSAGE_CREATE does nothing for unknown channel', () => {
    useDirectMessagesStore()
    const store = useDirectMessagesStore()
    store.dmChannels.push(makeDM('dm1', 'u1'))
    wsHandlers.get('MESSAGE_CREATE')!({ channelId: 'unknown', content: 'Hi', timestamp: '' })
    expect(store.dmChannels[0].lastMessage).toBeNull()
  })
})
