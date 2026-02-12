import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentUser, LoginCredentials, RegisterCredentials } from '@/types'
import { authApi } from '@/services/authApi'
import { wsService } from '@/services/websocket'
import { useServersStore } from './servers'
import { useFriendsStore } from './friends'
import { usePresenceStore } from './presence'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.READY, (data: unknown) => {
      const payload = data as {
        user: CurrentUser
        servers: unknown[]
        friends: unknown[]
        presences: unknown[]
      }
      user.value = payload.user
      useServersStore().setServers(payload.servers as never[])
      useFriendsStore().setFriends(payload.friends as never[])
      usePresenceStore().setBulkPresence(payload.presences as never[])
    })
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await authApi.login(credentials)
      accessToken.value = data.accessToken
      user.value = data.user
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      setupWsHandlers()
      wsService.connect(data.accessToken)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      error.value = err.response?.data?.message || 'Login failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function register(credentials: RegisterCredentials): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await authApi.register(credentials)
      accessToken.value = data.accessToken
      user.value = data.user
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      setupWsHandlers()
      wsService.connect(data.accessToken)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      error.value = err.response?.data?.message || 'Registration failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function initialize(): Promise<void> {
    if (!accessToken.value) return
    try {
      const { data } = await authApi.getMe()
      user.value = data
      setupWsHandlers()
      wsService.connect(accessToken.value)
    } catch {
      logout()
    }
  }

  function logout(): void {
    authApi.logout().catch(() => {})
    wsService.disconnect()
    user.value = null
    accessToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    initialize,
    logout,
  }
})
