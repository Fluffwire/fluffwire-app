import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '@/types'
import api from '@/services/api'
import { API } from '@/constants/endpoints'
import { useTheme, type ThemeName } from '@/composables/useTheme'
import { useServersStore } from '@/stores/servers'
import { useVoiceStore } from '@/stores/voice'
import { wsDispatcher } from '@/services/wsDispatcher'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings | null>(null)
  const isFetched = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // Setup WebSocket handler for real-time settings sync across devices
  function setupWsHandlers() {
    wsDispatcher.register('SETTINGS_UPDATE', (data: unknown) => {
      const updated = data as UserSettings
      settings.value = updated
      applyToLocalState(updated)
    })
  }
  setupWsHandlers()

  async function fetchSettings() {
    try {
      const { data } = await api.get<UserSettings>(API.USERS.SETTINGS)
      settings.value = data
      isFetched.value = true
      applyToLocalState(data)
    } catch {
      // Settings may not exist yet for new users — use defaults
    }
  }

  function updateSetting(partial: Partial<UserSettings>) {
    if (settings.value) {
      Object.assign(settings.value, partial)
    }

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        await api.patch(API.USERS.SETTINGS, partial)
      } catch {
        // Silently fail — local state still has the value
      }
    }, 1500)
  }

  function applyToLocalState(s: UserSettings) {
    // Theme
    if (s.theme) {
      const stored = localStorage.getItem('fluffwire-theme')
      if (!stored || stored !== s.theme) {
        const { setTheme } = useTheme()
        setTheme(s.theme as ThemeName)
      }
    }

    // Server order (always apply, even if empty, to sync across devices)
    const serversStore = useServersStore()
    if (s.serverOrder?.length) {
      serversStore.saveServerOrder(s.serverOrder)
    } else {
      // If backend has no server order yet, sync current local order to backend
      const currentOrder = serversStore.serverOrder
      if (currentOrder?.length) {
        updateSetting({ serverOrder: currentOrder })
      }
    }

    // Presence / user status
    if (s.userStatus) {
      localStorage.setItem('fluffwire-user-status', s.userStatus)
    }

    // Voice settings
    const voiceStore = useVoiceStore()
    if (s.voiceMode) voiceStore.voiceMode = s.voiceMode
    if (typeof s.vadThreshold === 'number') voiceStore.vadThreshold = s.vadThreshold
    if (s.pttKey) voiceStore.pttKey = s.pttKey
    localStorage.setItem('fluffwire-voice-settings', JSON.stringify({
      voiceMode: s.voiceMode,
      vadThreshold: s.vadThreshold,
      pttKey: s.pttKey,
    }))

    // Notifications
    if (typeof s.notificationSound === 'boolean') {
      localStorage.setItem('fluffwire-notification-sound', String(s.notificationSound))
    }
    if (typeof s.notificationDesktop === 'boolean') {
      localStorage.setItem('fluffwire-desktop-notifications', String(s.notificationDesktop))
    }

    // Auto-start (desktop only, handled by Tauri plugin)
    if (typeof s.autoStartEnabled === 'boolean') {
      localStorage.setItem('fluffwire-auto-start', String(s.autoStartEnabled))
    }

    // Start minimized (desktop only)
    if (typeof s.startMinimized === 'boolean') {
      localStorage.setItem('fluffwire-start-minimized', String(s.startMinimized))
    }
  }

  return {
    settings,
    isFetched,
    fetchSettings,
    updateSetting,
  }
})
