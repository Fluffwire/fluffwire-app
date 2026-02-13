import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserStatus } from '@/types'
import { wsService } from '@/services/websocket'
import { WsOpCode } from '@/types/websocket'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { useAuthStore } from '@/stores/auth'

interface PresenceEntry {
  userId: string
  status: UserStatus
  customStatus?: string
}

export const usePresenceStore = defineStore('presence', () => {
  const presences = ref<Map<string, PresenceEntry>>(new Map())

  // Track the user's manually chosen status (persisted) vs auto-idle
  const userChosenStatus = ref<UserStatus>(
    (localStorage.getItem('fluffwire-user-status') as UserStatus) ?? 'online'
  )
  const isAutoIdle = ref(false)

  function getStatus(userId: string): UserStatus {
    return presences.value.get(userId)?.status ?? 'offline'
  }

  function getCustomStatus(userId: string): string | undefined {
    return presences.value.get(userId)?.customStatus
  }

  function setBulkPresence(data: PresenceEntry[]) {
    data.forEach((entry) => {
      presences.value.set(entry.userId, entry)
    })
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.PRESENCE_UPDATE, (data: unknown) => {
      const entry = data as PresenceEntry
      presences.value.set(entry.userId, entry)
    })
  }
  setupWsHandlers()

  function setOwnStatus(status: UserStatus, customStatus?: string, isAuto = false) {
    wsService.send({
      op: WsOpCode.PRESENCE_UPDATE,
      d: { status, customStatus },
    })
    // Update local state immediately (server doesn't echo back to sender)
    const authStore = useAuthStore()
    if (authStore.user) {
      presences.value.set(authStore.user.id, {
        userId: authStore.user.id,
        status,
        customStatus,
      })
    }

    if (!isAuto) {
      // Manual selection — save as the user's chosen status
      userChosenStatus.value = status
      isAutoIdle.value = false
      localStorage.setItem('fluffwire-user-status', status)
      import('@/stores/settings').then(({ useSettingsStore }) => {
        const settingsStore = useSettingsStore()
        if (settingsStore.isFetched) {
          settingsStore.updateSetting({ userStatus: status })
        }
      })
    }
  }

  function setAutoIdle() {
    // Only auto-idle if the user's chosen status is 'online'
    if (userChosenStatus.value !== 'online') return
    if (isAutoIdle.value) return
    isAutoIdle.value = true
    setOwnStatus('idle', undefined, true)
  }

  function restoreFromIdle() {
    if (!isAutoIdle.value) return
    isAutoIdle.value = false
    setOwnStatus(userChosenStatus.value, undefined, true)
  }

  /**
   * Restore the user's preferred status after WS reconnect.
   * Call after READY has been processed.
   */
  function restoreOwnStatus() {
    const saved = localStorage.getItem('fluffwire-user-status') as UserStatus | null
    if (saved && saved !== 'offline') {
      setOwnStatus(saved)
    } else if (saved === 'offline') {
      // User chose "Invisible" — re-send offline status
      setOwnStatus('offline')
    }
    // If no saved status, use server default (online)
  }

  return {
    presences,
    getStatus,
    getCustomStatus,
    setBulkPresence,
    setOwnStatus,
    setAutoIdle,
    restoreFromIdle,
    restoreOwnStatus,
  }
})
