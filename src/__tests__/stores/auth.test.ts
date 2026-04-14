import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
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

vi.mock('@/services/desktopNotifications', () => ({
  desktopNotifications: { init: vi.fn().mockResolvedValue(undefined) },
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

function mockUser(id = '1') {
  return { id, username: 'test', displayName: 'Test', email: 'test@test.com', avatar: null, status: 'online', createdAt: '', totpEnabled: false }
}

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
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt', user: mockUser() },
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
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt', user: mockUser() },
    } as never)

    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: 'password123' })
    expect(store.isAuthenticated).toBe(true)

    store.logout()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
  })

  it('register sets user and tokens on success', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.register).mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt', user: mockUser() },
    } as never)

    const store = useAuthStore()
    await store.register({ email: 'new@test.com', password: 'pass123', username: 'newuser', displayName: 'New' })
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.username).toBe('test')
  })

  it('register sets error on failure', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.register).mockRejectedValueOnce({
      response: { data: { message: 'email taken' } },
    })

    const store = useAuthStore()
    await expect(store.register({ email: 'taken@test.com', password: 'pass', username: 'x', displayName: 'X' })).rejects.toBeTruthy()
    expect(store.error).toBe('email taken')
  })

  it('verifyTwoFactor completes login', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.post).mockResolvedValueOnce({
      data: { accessToken: 'at2', refreshToken: 'rt2', user: mockUser() },
    } as never)

    const store = useAuthStore()
    store.twoFactorTicket = 'tkt-123'
    await store.verifyTwoFactor('123456')
    expect(store.isAuthenticated).toBe(true)
    expect(store.twoFactorTicket).toBeNull()
  })

  it('verifyTwoFactor sets error on wrong code', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.post).mockRejectedValueOnce({
      response: { data: { message: 'Invalid code' } },
    })

    const store = useAuthStore()
    store.twoFactorTicket = 'tkt-123'
    await expect(store.verifyTwoFactor('000000')).rejects.toBeTruthy()
    expect(store.error).toBe('Invalid code')
  })

  it('initialize restores session from stored token', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.getMe).mockResolvedValueOnce({ data: mockUser() } as never)
    mockStorage.set('accessToken', 'stored-token')

    const store = useAuthStore()
    await store.initialize()
    expect(store.isAuthenticated).toBe(true)
  })

  it('initialize logs out when token is invalid', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.getMe).mockRejectedValueOnce(new Error('401'))
    mockStorage.set('accessToken', 'bad-token')

    const store = useAuthStore()
    await store.initialize()
    expect(store.isAuthenticated).toBe(false)
  })

  it('updateProfile patches user data', async () => {
    const api = await import('@/services/api')
    const updated = mockUser()
    updated.displayName = 'Updated Name'
    vi.mocked(api.default.patch).mockResolvedValueOnce({ data: updated } as never)

    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt', user: mockUser() },
    } as never)

    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: 'password' })
    await store.updateProfile({ displayName: 'Updated Name' })
    expect(store.user?.displayName).toBe('Updated Name')
  })

  it('loadUser fetches and updates user', async () => {
    const { authApi } = await import('@/services/authApi')
    vi.mocked(authApi.getMe).mockResolvedValueOnce({ data: mockUser('42') } as never)

    const store = useAuthStore()
    await store.loadUser()
    expect(store.user?.id).toBe('42')
  })

  it('deleteAccount calls API with password', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.delete).mockResolvedValueOnce({} as never)

    const store = useAuthStore()
    await store.deleteAccount('mypassword')
    expect(api.default.delete).toHaveBeenCalledWith(
      expect.any(String),
      { data: { password: 'mypassword' } }
    )
  })

  it('cancelDeletion calls API and refreshes user', async () => {
    const api = await import('@/services/api')
    const { authApi } = await import('@/services/authApi')
    vi.mocked(api.default.post).mockResolvedValueOnce({} as never)
    vi.mocked(authApi.getMe).mockResolvedValueOnce({ data: mockUser() } as never)

    const store = useAuthStore()
    await store.cancelDeletion()
    expect(api.default.post).toHaveBeenCalled()
    expect(store.user?.id).toBe('1')
  })

  it('changePassword calls API with both passwords', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.post).mockResolvedValueOnce({} as never)

    const store = useAuthStore()
    await store.changePassword('oldpass', 'newpass')
    expect(api.default.post).toHaveBeenCalledWith(
      expect.any(String),
      { currentPassword: 'oldpass', newPassword: 'newpass' }
    )
  })

  it('fetchSessions returns session list', async () => {
    const api = await import('@/services/api')
    const sessions = [{ id: 'sess1', createdAt: '', lastActive: '', userAgent: '' }]
    vi.mocked(api.default.get).mockResolvedValueOnce({ data: sessions } as never)

    const store = useAuthStore()
    const result = await store.fetchSessions()
    expect(result).toEqual(sessions)
  })

  it('revokeSession calls delete with session id', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.delete).mockResolvedValueOnce({} as never)

    const store = useAuthStore()
    await store.revokeSession('sess-abc')
    expect(api.default.delete).toHaveBeenCalledWith(expect.stringContaining('sess-abc'))
  })

  it('revokeAllSessions calls API', async () => {
    const api = await import('@/services/api')
    vi.mocked(api.default.post).mockResolvedValueOnce({} as never)

    const store = useAuthStore()
    await store.revokeAllSessions()
    expect(api.default.post).toHaveBeenCalled()
  })
})
