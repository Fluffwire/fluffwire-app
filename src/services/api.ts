import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosAdapter } from 'axios'
import { API } from '@/constants/endpoints'
import { getTokenStorage } from '@/services/tokenStorage'
import { debugLogger } from '@/utils/debug'
import { isTauri } from '@/utils/platform'

debugLogger.info('API', 'Initializing API client', {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  mode: import.meta.env.MODE,
  isTauri: isTauri()
})

// Tauri HTTP adapter
const tauriAdapter: AxiosAdapter = async (config) => {
  try {
    const { fetch } = await import('@tauri-apps/plugin-http')
    const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url!

    // Determine the Origin header based on the platform
    // Windows uses https://tauri.localhost, Linux/macOS uses tauri://localhost
    const isWindows = navigator.userAgent.includes('Windows')
    const origin = isWindows ? 'https://tauri.localhost' : 'tauri://localhost'

    // Convert axios headers to plain object
    const headers: Record<string, string> = {}
    if (config.headers) {
      // Handle both plain objects and AxiosHeaders
      if (typeof (config.headers as any).entries === 'function') {
        // AxiosHeaders with entries() method
        for (const [key, value] of (config.headers as any).entries()) {
          if (value !== undefined && value !== null) {
            headers[key] = String(value)
          }
        }
      } else {
        // Plain object
        for (const [key, value] of Object.entries(config.headers)) {
          if (value !== undefined && value !== null) {
            headers[key] = String(value)
          }
        }
      }
    }
    headers['Origin'] = origin

    // Prepare request body
    let body: string | undefined
    if (config.data) {
      // FormData uploads should use uploadFile() function, not this adapter
      if (config.data instanceof FormData) {
        throw new Error('FormData uploads must use uploadFile() function, not axios directly')
      }
      body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
    }

    debugLogger.info('API', 'Using Tauri HTTP plugin', {
      url,
      method: config.method,
      origin,
      headers,
      bodyLength: body?.length,
      bodyPreview: body?.substring(0, 100)
    })

    const response = await fetch(url, {
      method: config.method?.toUpperCase(),
      headers,
      body,
    })

    debugLogger.info('API', 'Tauri response received', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    })

    // Parse response body based on content type
    let data
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const text = await response.text()
      data = text ? JSON.parse(text) : null
    } else {
      data = await response.text()
    }

    // Build axios-compatible response
    const axiosResponse = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: {},
    }

    // Throw error for non-2xx status codes (axios behavior)
    if (!response.ok) {
      const error: any = new Error(`Request failed with status ${response.status}`)
      error.response = axiosResponse
      error.config = config
      throw error
    }

    return axiosResponse
  } catch (error: any) {
    debugLogger.error('API', 'Tauri fetch error', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    })
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
  adapter: isTauri() ? tauriAdapter : undefined,
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
  if (isTauri()) {
    // Use Tauri upload plugin
    const { upload } = await import('@tauri-apps/plugin-upload')
    const { BaseDirectory, writeFile, remove } = await import('@tauri-apps/plugin-fs')

    // Save file to temp directory
    const tempFileName = `upload_${Date.now()}_${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    await writeFile(tempFileName, uint8Array, {
      baseDir: BaseDirectory.Temp
    })

    try {
      // Get auth token
      const token = getTokenStorage().getItem('accessToken')
      if (!token) {
        throw new Error('No access token available for upload')
      }

      // Upload using Tauri plugin
      const url = `${import.meta.env.VITE_API_BASE_URL}/upload`
      const headers = new Map<string, string>()
      headers.set('Authorization', `Bearer ${token}`)

      debugLogger.info('API', 'Uploading file via Tauri upload plugin', {
        url,
        fileName: file.name,
        size: file.size
      })

      const response = await upload(
        url,
        tempFileName,
        (progress) => {
          debugLogger.info('API', 'Upload progress', progress)
        },
        headers
      )

      debugLogger.success('API', 'Upload complete', response)

      // Parse response - the upload plugin returns raw response
      // We need to parse it as JSON
      const data = typeof response === 'string' ? JSON.parse(response) : response

      return data
    } catch (error) {
      debugLogger.error('API', 'Upload failed', {
        error: error instanceof Error ? error.message : String(error),
        fileName: file.name,
        size: file.size
      })
      throw error
    } finally {
      // Clean up temp file
      try {
        await remove(tempFileName, { baseDir: BaseDirectory.Temp })
      } catch (e) {
        debugLogger.warn('API', 'Failed to clean up temp file', e)
      }
    }
  } else {
    // Browser: use FormData
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }
}

export default api
