import { isTauri } from '@/utils/platform'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
}

class DesktopNotificationService {
  private permissionGranted = false

  async init() {
    if (isTauri()) {
      // Tauri notifications - check permission
      try {
        const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
        this.permissionGranted = await isPermissionGranted()
        if (!this.permissionGranted) {
          const permission = await requestPermission()
          this.permissionGranted = permission === 'granted'
        }
      } catch (error) {
        console.error('Failed to initialize Tauri notifications:', error)
      }
    } else if ('Notification' in window) {
      // Web Notification API
      if (Notification.permission === 'granted') {
        this.permissionGranted = true
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        this.permissionGranted = permission === 'granted'
      }
    }
  }

  async show(options: NotificationOptions) {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted')
      return
    }

    try {
      if (isTauri()) {
        // Check if window is focused
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const isFocused = await getCurrentWindow().isFocused()
        
        // Only show notification if window is not focused
        if (isFocused) return

        const { sendNotification } = await import('@tauri-apps/plugin-notification')
        await sendNotification({
          title: options.title,
          body: options.body,
        })
      } else if ('Notification' in window && document.hidden) {
        // Web notifications - only when page is hidden
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/fluffwire-icon.png',
        })
      }
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }
}

export const desktopNotifications = new DesktopNotificationService()
