import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosAdapter } from 'axios'
import { API } from '@/constants/endpoints'
import { getTokenStorage } from '@/services/tokenStorage'
import { debugLogger, isTauri } from '@/utils/debug'

debugLogger.info('API', 'Initializing API client', {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  mode: import.meta.env.MODE,
  isTauri
})

// Tauri HTTP adapter
const tauriAdapter: AxiosAdapter = async (config) => {
  try {
    const { fetch } = await import('@tauri-apps/plugin-http')
    const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url!

    debugLogger.info('API', 'Using Tauri HTTP plugin', { url, method: config.method })

    const response = await fetch(url, {
      method: config.method?.toUpperCase(),
      headers: config.headers as Record<string, string>,
      body: config.data ? JSON.stringify(config.data) : undefined,
    })

    const data = await response.json()

    return {
      data,
      status: response.status,
      statusText: response.ok ? 'OK' : 'Error',
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: {},
    }
  } catch (error) {
    debugLogger.error('API', 'Tauri fetch error', error)
    throw error
  }
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Use Tauri adapter when in Tauri environment
  adapter: isTauri ? tauriAdapter : undefined,
})

// Request interceptor: attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  debugLogger.info('API', 'Outgoing request', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`
  })
  const token = getTokenStorage().getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    debugLogger.info('API', 'Attached auth token to request')
  }
  return config
}, (error) => {
  debugLogger.error('API', 'Request interceptor error', error)
  return Promise.reject(error)
})

// Response interceptor: handle 401 with token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    debugLogger.success('API', 'Response received', {
      status: response.status,
      url: response.config.url
    })
    return response
  },
  async (error) => {
    debugLogger.error('API', 'Response error', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      code: error.code,
      responseData: error.response?.data
    })
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const storage = getTokenStorage()
        const refreshToken = storage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}${API.AUTH.REFRESH}`,
          { refreshToken }
        )

        storage.setItem('accessToken', data.accessToken)
        storage.setItem('refreshToken', data.refreshToken)
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export async function uploadFile(file: File): Promise<{
  id: string
  filename: string
  url: string
  contentType: string
  size: number
}> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export default api
