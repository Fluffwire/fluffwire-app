import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChannelsStore } from '@/stores/channels'
import { useNotificationSettingsStore } from '@/stores/notificationSettings'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { soundManager } from '@/composables/useSounds'
import { isTauri } from '@/utils/platform'
import type { Message } from '@/types'

const STORAGE_KEYS = {
  sound: 'fluffwire-notification-sound',
  desktop: 'fluffwire-desktop-notifications',
} as const

// Shared reactive state (singleton across all calls)
const soundEnabled = ref(localStorage.getItem(STORAGE_KEYS.sound) !== 'false')
const desktopEnabled = ref(localStorage.getItem(STORAGE_KEYS.desktop) !== 'false') // Default to true

function setSoundEnabled(value: boolean) {
  soundEnabled.value = value
  localStorage.setItem(STORAGE_KEYS.sound, String(value))
  soundManager.setEnabled(value)
  import('@/stores/settings').then(({ useSettingsStore }) => {
    const settingsStore = useSettingsStore()
    if (settingsStore.isFetched) {
      settingsStore.updateSetting({ notificationSound: value })
    }
  })
}

async function setDesktopEnabled(value: boolean) {
  if (value) {
    const granted = await requestDesktopPermission()
    if (!granted) {
      desktopEnabled.value = false
      localStorage.setItem(STORAGE_KEYS.desktop, 'false')
      return false
    }
  }
  desktopEnabled.value = value
  localStorage.setItem(STORAGE_KEYS.desktop, String(value))
  import('@/stores/settings').then(({ useSettingsStore }) => {
    const settingsStore = useSettingsStore()
    if (settingsStore.isFetched) {
      settingsStore.updateSetting({ notificationDesktop: value })
    }
  })
  return true
}

async function requestDesktopPermission(): Promise<boolean> {
  // Tauri: Use native notification plugin (always granted)
  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
      let granted = await isPermissionGranted()
      if (!granted) {
        const permission = await requestPermission()
        granted = permission === 'granted'
      }
      return granted
    } catch (error) {
      console.error('Failed to request Tauri notification permission:', error)
      return false
    }
  }

  // Web: Use browser Notification API
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}


function playTestSound() {
  soundManager.play('notification')
}

/**
 * Returns reactive notification settings + setters for use in SettingsView.
 */
export function useNotificationSettings() {
  return {
    soundEnabled,
    desktopEnabled,
    setSoundEnabled,
    setDesktopEnabled,
    requestDesktopPermission,
    playTestSound,
    get desktopPermission() {
      // Tauri always returns 'granted' (handled by requestDesktopPermission)
      if (isTauri()) return 'granted'
      return 'Notification' in window ? Notification.permission : 'denied'
    },
  }
}

/**
 * Call once in AppLayout to initialize notification handling.
 * Registers a MESSAGE_CREATE handler on the WebSocket dispatcher.
 */
export function useNotifications() {
  const route = useRoute()
  const authStore = useAuthStore()

  // Sync soundManager enabled state with persisted setting
  soundManager.setEnabled(soundEnabled.value)

  async function showDesktopNotification(message: Message) {
    if (!desktopEnabled.value) return

    const title = message.author.displayName
    const body = message.content.length > 100
      ? message.content.slice(0, 100) + '...'
      : message.content

    // Tauri: Use native notification plugin
    if (isTauri()) {
      try {
        const { sendNotification, isPermissionGranted } = await import('@tauri-apps/plugin-notification')
        const granted = await isPermissionGranted()
        if (!granted) return

        sendNotification({
          title,
          body,
        })
      } catch (error) {
        console.error('Failed to send Tauri notification:', error)
      }
      return
    }

    // Web: Use browser Notification API
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const notification = new Notification(title, {
      body,
      tag: `msg-${message.id}`,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }

  function isViewingChannel(channelId: string): boolean {
    return (
      route.params.channelId === channelId ||
      route.params.dmId === channelId
    )
  }

  // Register WS handler
  const handler = (data: unknown) => {
    const message = data as Message

    // Skip own messages
    if (message.author.id === authStore.user?.id) return

    // Skip if viewing this channel AND tab is visible
    if (isViewingChannel(message.channelId) && !document.hidden) return

    // Skip if server is muted
    if (message.channelId) {
      const notifSettings = useNotificationSettingsStore()
      const channelsStore = useChannelsStore()
      const channel = channelsStore.channels.find((c) => c.id === message.channelId)
      if (channel?.serverId && notifSettings.isMuted(channel.serverId)) return
    }

    soundManager.play('notification')
    showDesktopNotification(message)
  }

  wsDispatcher.register(WS_EVENTS.MESSAGE_CREATE, handler)
}
