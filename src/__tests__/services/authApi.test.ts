import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/constants/endpoints', () => ({
  API: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      ME: '/auth/me',
      REFRESH: '/auth/refresh',
    },
  },
}))

describe('authApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('login calls POST /auth/login', async () => {
    const api = (await import('@/services/api')).default
    const { authApi } = await import('@/services/authApi')
    await authApi.login({ email: 'a@b.com', password: 'pass' })
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass' })
  })

  it('register calls POST /auth/register', async () => {
    const api = (await import('@/services/api')).default
    const { authApi } = await import('@/services/authApi')
    await authApi.register({ email: 'a@b.com', password: 'pass', username: 'alice', displayName: 'Alice' })
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ email: 'a@b.com' }))
  })

  it('logout calls POST /auth/logout', async () => {
    const api = (await import('@/services/api')).default
    const { authApi } = await import('@/services/authApi')
    await authApi.logout()
    expect(api.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('getMe calls GET /auth/me', async () => {
    const api = (await import('@/services/api')).default
    const { authApi } = await import('@/services/authApi')
    await authApi.getMe()
    expect(api.get).toHaveBeenCalledWith('/auth/me')
  })

  it('refresh calls POST /auth/refresh with token', async () => {
    const api = (await import('@/services/api')).default
    const { authApi } = await import('@/services/authApi')
    await authApi.refresh('rt-token')
    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'rt-token' })
  })
})
