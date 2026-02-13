import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock services
vi.mock('@/services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
  },
}))

vi.mock('@/services/websocket', () => ({
  wsService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: { register: vi.fn() },
  WS_EVENTS: { READY: 'READY' },
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ fetchSettings: vi.fn() }),
}))

const mockStorage = new Map<string, string>()
vi.mock('@/services/tokenStorage', () => ({
  getTokenStorage: () => ({
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, v),
    removeItem: (k: string) => mockStorage.delete(k),
  }),
  setRememberMe: vi.fn(),
}))

describe('auth store', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts unauthenticated', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.error).toBeNull()
  })

  it('login sets user and tokens on success', async () => {
    const { authApi } = await import('@/services/authApi')
    const mockUser = { id: '1', username: 'test', displayName: 'Test', email: 'test@test.com', avatar: null, status: 'online', createdAt: '', totpEnabled: false }
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt', user: mockUser },
    } as never)

    const store = useAuthStore()
    const result = await store.login({ email: 'test@test.com', password: 'password123' })

    expect(result).toBe('success')
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.username).toBe('test')
    expect(store.accessToken).toBe('at')
  })

  it('login returns 2fa when required', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { accessToken: '', refreshToken: '', user: null, requiresTwoFactor: true, ticket: 'tkt-123' },
    } as never)

    const store = useAuthStore()
    const result = await store.login({ email: 'test@test.com', password: 'password123' })

    expect(result).toBe('2fa')
    expect(store.twoFactorTicket).toBe('tkt-123')
    expect(store.isAuthenticated).toBe(false)
  })

  it('login sets error on failure', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: { data: { message: 'invalid credentials' } },
    })

    const store = useAuthStore()
    await expect(store.login({ email: 'bad@test.com', password: 'wrong' })).rejects.toBeTruthy()
    expect(store.error).toBe('invalid credentials')
    expect(store.isAuthenticated).toBe(false)
  })

  it('logout clears state', async () => {
    const { authApi } = await import('@/services/authApi')
    const mockUser = { id: '1', username: 'test', displayName: 'Test', email: 'test@test.com', avatar: null, status: 'online', createdAt: '', totpEnabled: false }
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt', user: mockUser },
    } as never)

    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: 'password123' })
    expect(store.isAuthenticated).toBe(true)

    store.logout()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
  })
})
