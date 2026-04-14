import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePresenceStore } from '@/stores/presence'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    PRESENCE_UPDATE: 'PRESENCE_UPDATE',
  },
}))

vi.mock('@/services/websocket', () => ({
  wsService: { send: vi.fn() },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'me' } }),
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ isFetched: false, updateSetting: vi.fn() }),
}))

describe('presence store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('getStatus returns offline for unknown user', () => {
    const store = usePresenceStore()
    expect(store.getStatus('unknown')).toBe('offline')
  })

  it('setBulkPresence sets multiple entries', () => {
    const store = usePresenceStore()
    store.setBulkPresence([
      { userId: 'u1', status: 'online' },
      { userId: 'u2', status: 'idle' },
    ])
    expect(store.getStatus('u1')).toBe('online')
    expect(store.getStatus('u2')).toBe('idle')
  })

  it('getCustomStatus returns undefined for user without custom status', () => {
    const store = usePresenceStore()
    store.setBulkPresence([{ userId: 'u1', status: 'online' }])
    expect(store.getCustomStatus('u1')).toBeUndefined()
  })

  it('getCustomStatus returns custom status string', () => {
    const store = usePresenceStore()
    store.setBulkPresence([{ userId: 'u1', status: 'online', customStatus: 'Coding' }])
    expect(store.getCustomStatus('u1')).toBe('Coding')
  })

  it('setOwnStatus sends WS message and updates local state', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = usePresenceStore()
    store.setOwnStatus('dnd')
    expect(wsService.send).toHaveBeenCalledWith(
      expect.objectContaining({ d: expect.objectContaining({ status: 'dnd' }) })
    )
    expect(store.getStatus('me')).toBe('dnd')
  })

  it('setOwnStatus persists chosen status to localStorage', () => {
    const store = usePresenceStore()
    store.setOwnStatus('idle')
    expect(localStorage.setItem).toHaveBeenCalledWith('fluffwire-user-status', 'idle')
  })

  it('setAutoIdle switches to idle when chosen status is online', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = usePresenceStore()
    // Default chosen status is online
    store.setAutoIdle()
    expect(wsService.send).toHaveBeenCalledWith(
      expect.objectContaining({ d: expect.objectContaining({ status: 'idle' }) })
    )
  })

  it('setAutoIdle does nothing when chosen status is not online', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = usePresenceStore()
    store.setOwnStatus('dnd')
    vi.clearAllMocks()
    store.setAutoIdle()
    expect(wsService.send).not.toHaveBeenCalled()
  })

  it('setAutoIdle does nothing if already auto-idle', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = usePresenceStore()
    store.setAutoIdle()
    vi.clearAllMocks()
    store.setAutoIdle()
    expect(wsService.send).not.toHaveBeenCalled()
  })

  it('restoreFromIdle restores chosen status', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = usePresenceStore()
    store.setAutoIdle()
    vi.clearAllMocks()
    store.restoreFromIdle()
    expect(wsService.send).toHaveBeenCalledWith(
      expect.objectContaining({ d: expect.objectContaining({ status: 'online' }) })
    )
  })

  it('restoreFromIdle does nothing when not auto-idle', async () => {
    const { wsService } = await import('@/services/websocket')
    const store = usePresenceStore()
    store.restoreFromIdle()
    expect(wsService.send).not.toHaveBeenCalled()
  })

  // WS handlers
  it('WS PRESENCE_UPDATE updates presence entry', () => {
    usePresenceStore()
    wsHandlers.get('PRESENCE_UPDATE')!({ userId: 'u1', status: 'dnd', customStatus: 'Busy' })
    const store = usePresenceStore()
    expect(store.getStatus('u1')).toBe('dnd')
    expect(store.getCustomStatus('u1')).toBe('Busy')
  })
})
