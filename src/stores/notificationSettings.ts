import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'fluffwire-server-mute'

export const useNotificationSettingsStore = defineStore('notificationSettings', () => {
  const mutedServers = ref<Set<string>>(new Set(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  ))

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...mutedServers.value]))
  }

  function isMuted(serverId: string): boolean {
    return mutedServers.value.has(serverId)
  }

  function toggleMute(serverId: string) {
    if (mutedServers.value.has(serverId)) {
      mutedServers.value.delete(serverId)
    } else {
      mutedServers.value.add(serverId)
    }
    persist()
  }

  return {
    mutedServers,
    isMuted,
    toggleMute,
  }
})
