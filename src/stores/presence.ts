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

  function setOwnStatus(status: UserStatus, customStatus?: string) {
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
    // Persist chosen status for page refresh
    localStorage.setItem('fluffwire-user-status', status)
  }

  /**
   * Restore the user's preferred status after WS reconnect.
   * Call after READY has been processed.
   */
  function restoreOwnStatus() {
    const saved = localStorage.getItem('fluffwire-user-status') as UserStatus | null
    if (saved && saved !== 'offline') {
      // Re-send the saved status so other users see it
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
    restoreOwnStatus,
  }
})
