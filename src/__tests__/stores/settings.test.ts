import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {},
}))

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/constants/endpoints', () => ({
  API: { USERS: { SETTINGS: '/users/me/settings' } },
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}))

vi.mock('@/stores/servers', () => ({
  useServersStore: () => ({
    serverOrder: [],
    saveServerOrder: vi.fn(),
  }),
}))

vi.mock('@/stores/voice', () => ({
  useVoiceStore: () => ({
    voiceMode: 'vad',
    vadThreshold: 0.3,
    pttKey: null,
  }),
}))

function makeSettings(overrides = {}) {
  return {
    theme: 'dark',
    serverOrder: ['s1', 's2'],
    userStatus: 'online',
    notificationSound: true,
    notificationDesktop: false,
    voiceMode: 'vad',
    vadThreshold: 0.3,
    pttKey: null,
    ...overrides,
  }
}

describe('settings store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts unfetched with null settings', () => {
    const store = useSettingsStore()
    expect(store.settings).toBeNull()
    expect(store.isFetched).toBe(false)
  })

  it('fetchSettings loads settings and marks fetched', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockResolvedValueOnce({ data: makeSettings() } as never)

    const store = useSettingsStore()
    await store.fetchSettings()
    expect(store.settings?.theme).toBe('dark')
    expect(store.isFetched).toBe(true)
  })

  it('fetchSettings handles missing settings gracefully', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockRejectedValueOnce(new Error('404'))

    const store = useSettingsStore()
    await store.fetchSettings()
    expect(store.settings).toBeNull()
    expect(store.isFetched).toBe(false)
  })

  it('updateSetting patches API after debounce', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockResolvedValueOnce({ data: makeSettings() } as never)

    const store = useSettingsStore()
    await store.fetchSettings()

    store.updateSetting({ theme: 'light' })
    expect(api.default.patch).not.toHaveBeenCalled() // debounced

    vi.advanceTimersByTime(1600)
    await vi.runAllTimersAsync()
    expect(api.default.patch).toHaveBeenCalledWith('/users/me/settings', { theme: 'light' })
  })

  it('updateSetting merges into local settings immediately', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockResolvedValueOnce({ data: makeSettings() } as never)

    const store = useSettingsStore()
    await store.fetchSettings()

    store.updateSetting({ theme: 'light' })
    expect(store.settings?.theme).toBe('light')
  })

  it('updateSetting debounce resets on rapid calls', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockResolvedValueOnce({ data: makeSettings() } as never)

    const store = useSettingsStore()
    await store.fetchSettings()

    store.updateSetting({ theme: 'light' })
    vi.advanceTimersByTime(800)
    store.updateSetting({ theme: 'dark' })
    vi.advanceTimersByTime(1600)
    await vi.runAllTimersAsync()

    // Should only be called once with the last value
    expect(api.default.patch).toHaveBeenCalledTimes(1)
    expect(api.default.patch).toHaveBeenCalledWith('/users/me/settings', { theme: 'dark' })
  })

  it('applyToLocalState persists userStatus to localStorage', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockResolvedValueOnce({ data: makeSettings({ userStatus: 'dnd' }) } as never)

    const store = useSettingsStore()
    await store.fetchSettings()
    expect(localStorage.setItem).toHaveBeenCalledWith('fluffwire-user-status', 'dnd')
  })

  it('applyToLocalState persists notification settings to localStorage', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.get).mockResolvedValueOnce({
      data: makeSettings({ notificationSound: false, notificationDesktop: true }),
    } as never)

    const store = useSettingsStore()
    await store.fetchSettings()
    expect(localStorage.setItem).toHaveBeenCalledWith('fluffwire-notification-sound', 'false')
    expect(localStorage.setItem).toHaveBeenCalledWith('fluffwire-desktop-notifications', 'true')
  })

  // WS handler
  it('WS SETTINGS_UPDATE replaces settings and applies them', async () => {
    useSettingsStore()
    const updated = makeSettings({ theme: 'light', userStatus: 'idle' })
    wsHandlers.get('SETTINGS_UPDATE')!(updated)
    const store = useSettingsStore()
    expect(store.settings?.theme).toBe('light')
  })
})
