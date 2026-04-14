import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// Must mock before importing api
vi.mock('@/utils/debug', () => ({
  debugLogger: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/utils/platform', () => ({
  isTauri: () => false,
}))

vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn() },
}))

const mockStorage = new Map<string, string>()
vi.mock('@/services/tokenStorage', () => ({
  getTokenStorage: () => ({
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, v),
    removeItem: (k: string) => mockStorage.delete(k),
  }),
  isRememberMe: () => true,
}))

vi.mock('@/constants/endpoints', () => ({
  API: {
    AUTH: { REFRESH: '/auth/refresh', LOGIN: '/auth/login' },
  },
}))

// Helper to get interceptor handlers from the real api instance
async function getInterceptors() {
  const apiModule = await import('@/services/api')
  const api = apiModule.default
  // Access internal axios interceptor handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqHandlers = (api.interceptors.request as any).handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resHandlers = (api.interceptors.response as any).handlers
  return {
    reqFulfilled: reqHandlers[0]?.fulfilled as (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig,
    resFulfilled: resHandlers[0]?.fulfilled as (res: AxiosResponse) => AxiosResponse,
    resRejected: resHandlers[0]?.rejected as (err: unknown) => Promise<unknown>,
  }
}

describe('api interceptors', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
  })

  // Request interceptor
  it('request interceptor attaches Bearer token when stored', async () => {
    mockStorage.set('accessToken', 'my-token')
    const { reqFulfilled } = await getInterceptors()
    const config = { headers: {} } as InternalAxiosRequestConfig
    const result = reqFulfilled(config)
    expect(result.headers.Authorization).toBe('Bearer my-token')
  })

  it('request interceptor skips Authorization when no token', async () => {
    const { reqFulfilled } = await getInterceptors()
    const config = { headers: {} } as InternalAxiosRequestConfig
    const result = reqFulfilled(config)
    expect(result.headers.Authorization).toBeUndefined()
  })

  // Response interceptor — success passthrough
  it('response interceptor passes through successful responses', async () => {
    const { resFulfilled } = await getInterceptors()
    const mockResponse = { status: 200, data: { ok: true }, config: { url: '/test' } } as AxiosResponse
    const result = resFulfilled(mockResponse)
    expect(result).toBe(mockResponse)
  })

  // Response interceptor — error toasts
  it('shows Server Error toast for 500', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: { status: 500, data: {} },
      config: { _retry: false, url: '/test' },
      message: 'Internal Server Error',
      code: undefined,
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Server Error', expect.any(Object))
  })

  it('shows Access Denied toast for 403', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: { status: 403, data: {} },
      config: { _retry: false },
      message: 'Forbidden',
      code: undefined,
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Access Denied', expect.any(Object))
  })

  it('shows Not Found toast for 404', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: { status: 404, data: {} },
      config: { _retry: false },
      message: 'Not Found',
      code: undefined,
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Not Found', expect.any(Object))
  })

  it('shows Rate Limit toast for 429', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: { status: 429, data: {} },
      config: { _retry: false },
      message: 'Too Many Requests',
      code: undefined,
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Rate Limit Exceeded', expect.any(Object))
  })

  it('shows Request Failed toast for other 4xx', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: { status: 422, data: { message: 'Validation failed' } },
      config: { _retry: false },
      message: 'Unprocessable Entity',
      code: undefined,
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Request Failed', expect.any(Object))
  })

  it('shows Network Error toast for ECONNABORTED', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: undefined,
      config: { _retry: false },
      message: 'timeout',
      code: 'ECONNABORTED',
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Network Error', expect.any(Object))
  })

  it('shows Server Unavailable toast for ECONNREFUSED', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    const error = {
      response: undefined,
      config: { _retry: false },
      message: 'connection refused',
      code: 'ECONNREFUSED',
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Server Unavailable', expect.any(Object))
  })

  it('shows Session Expired toast for 401 when no refresh token', async () => {
    const { toast } = await import('vue-sonner')
    const { resRejected } = await getInterceptors()
    // No refresh token in storage → refresh fails → shows Session Expired toast
    const error = {
      response: { status: 401, data: {} },
      config: { _retry: false, headers: {} },
      message: 'Unauthorized',
      code: undefined,
    }
    await expect(resRejected(error)).rejects.toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Session Expired', expect.any(Object))
  })
})
