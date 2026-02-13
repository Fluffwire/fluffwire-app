import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentUser, LoginCredentials, RegisterCredentials, SessionInfo } from '@/types'
import { authApi } from '@/services/authApi'
import api from '@/services/api'
import { API } from '@/constants/endpoints'
import { wsService } from '@/services/websocket'
import { useServersStore } from './servers'
import { useFriendsStore } from './friends'
import { usePresenceStore } from './presence'
import { useReadStateStore } from './readState'
import { useSettingsStore } from './settings'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { getTokenStorage, setRememberMe } from '@/services/tokenStorage'

export const useAuthStore = defineStore('auth', () => {
  const storage = getTokenStorage()
  const user = ref<CurrentUser | null>(null)
  const accessToken = ref<string | null>(storage.getItem('accessToken'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)
  const twoFactorTicket = ref<string | null>(null)

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.READY, (data: unknown) => {
      const payload = data as {
        user: CurrentUser
        servers: unknown[]
        friends: unknown[]
        presences: unknown[]
        readStates: { userId: string; channelId: string; lastMessageId: string }[]
      }
      user.value = payload.user
      useServersStore().setServers(payload.servers as never[])
      useFriendsStore().setFriends(payload.friends as never[])
      const presenceStore = usePresenceStore()
      presenceStore.setBulkPresence(payload.presences as never[])
      presenceStore.restoreOwnStatus()
      if (payload.readStates) {
        useReadStateStore().setReadStates(payload.readStates)
      }
    })
  }

  function storeTokens(access: string, refresh: string) {
    const s = getTokenStorage()
    s.setItem('accessToken', access)
    s.setItem('refreshToken', refresh)
  }

  async function login(credentials: LoginCredentials, rememberMe = true): Promise<'success' | '2fa'> {
    isLoading.value = true
    error.value = null
    try {
      setRememberMe(rememberMe)
      const { data } = await authApi.login(credentials)
      if (data.requiresTwoFactor) {
        twoFactorTicket.value = data.ticket ?? null
        return '2fa'
      }
      accessToken.value = data.accessToken
      user.value = data.user
      storeTokens(data.accessToken, data.refreshToken)
      setupWsHandlers()
      wsService.connect(data.accessToken)
      useSettingsStore().fetchSettings()
      return 'success'
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      error.value = err.response?.data?.message || 'Login failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function verifyTwoFactor(code: string): Promise<void> {
    if (!twoFactorTicket.value) throw new Error('No 2FA ticket')
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.post(API.AUTH.VERIFY_2FA, {
        ticket: twoFactorTicket.value,
        code,
      })
      twoFactorTicket.value = null
      accessToken.value = data.accessToken
      user.value = data.user
      storeTokens(data.accessToken, data.refreshToken)
      setupWsHandlers()
      wsService.connect(data.accessToken)
      useSettingsStore().fetchSettings()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      error.value = err.response?.data?.message || 'Invalid code'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function register(credentials: RegisterCredentials, rememberMe = true): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      setRememberMe(rememberMe)
      const { data } = await authApi.register(credentials)
      accessToken.value = data.accessToken
      user.value = data.user
      storeTokens(data.accessToken, data.refreshToken)
      setupWsHandlers()
      wsService.connect(data.accessToken)
      useSettingsStore().fetchSettings()
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
      useSettingsStore().fetchSettings()
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
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    localStorage.removeItem('fluffwire-remember')
  }

  async function updateProfile(data: { displayName?: string; avatar?: string; bio?: string }): Promise<void> {
    const { data: updated } = await api.patch(API.USERS.PROFILE, data)
    user.value = updated
  }

  async function deleteAccount(password: string): Promise<void> {
    await api.delete(API.USERS.DELETE_ACCOUNT, { data: { password } })
  }

  async function cancelDeletion(): Promise<void> {
    await api.post(API.USERS.CANCEL_DELETION)
    // Refetch user to clear deleteScheduledAt
    const { data } = await authApi.getMe()
    user.value = data
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post(API.USERS.CHANGE_PASSWORD, { currentPassword, newPassword })
  }

  async function fetchSessions(): Promise<SessionInfo[]> {
    const { data } = await api.get<SessionInfo[]>(API.AUTH.SESSIONS)
    return data
  }

  async function revokeSession(sessionId: string): Promise<void> {
    await api.delete(API.AUTH.SESSION_BY_ID(sessionId))
  }

  async function revokeAllSessions(): Promise<void> {
    await api.post(API.AUTH.REVOKE_ALL)
  }

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    twoFactorTicket,
    login,
    register,
    verifyTwoFactor,
    initialize,
    logout,
    updateProfile,
    deleteAccount,
    cancelDeletion,
    changePassword,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
  }
})
