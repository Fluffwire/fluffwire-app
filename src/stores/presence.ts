import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserStatus } from '@/types'
import { wsService } from '@/services/websocket'
import { WsOpCode } from '@/types/websocket'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

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
  }

  return {
    presences,
    getStatus,
    getCustomStatus,
    setBulkPresence,
    setOwnStatus,
  }
})
