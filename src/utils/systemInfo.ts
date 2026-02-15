import { isTauri } from '@/utils/platform'

export interface SystemInfo {
  appVersion: string
  platform: 'desktop' | 'web'
  os: string
  userAgent: string
  locale: string
  timestamp: string
  tauriVersion?: string
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const info: SystemInfo = {
    appVersion: import.meta.env.VITE_APP_VERSION || '0.7.3',
    platform: isTauri() ? 'desktop' : 'web',
    os: getOSInfo(),
    userAgent: navigator.userAgent,
    locale: navigator.language,
    timestamp: new Date().toISOString(),
  }

  // Get Tauri version if in desktop app
  if (isTauri()) {
    try {
      const { getTauriVersion } = await import('@tauri-apps/api/app')
      info.tauriVersion = await getTauriVersion()
    } catch (error) {
      console.error('Failed to get Tauri version:', error)
    }
  }

  return info
}

function getOSInfo(): string {
  const ua = navigator.userAgent
  const platform = navigator.platform

  // Windows
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1'
  if (ua.includes('Windows NT 6.2')) return 'Windows 8'
  if (ua.includes('Windows NT 6.1')) return 'Windows 7'
  if (ua.includes('Windows')) return 'Windows'

  // macOS
  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/)
    return match ? `macOS ${match[1]?.replace('_', '.') || ''}` : 'macOS'
  }

  // Linux
  if (platform.includes('Linux') || ua.includes('Linux')) {
    if (ua.includes('Ubuntu')) return 'Ubuntu Linux'
    if (ua.includes('Fedora')) return 'Fedora Linux'
    if (ua.includes('Debian')) return 'Debian Linux'
    return 'Linux'
  }

  // Android
  if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+)/)
    return match ? `Android ${match[1]}` : 'Android'
  }

  // iOS
  if (/iPhone|iPad|iPod/.test(ua)) {
    const match = ua.match(/OS (\d+_\d+)/)
    return match ? `iOS ${match[1]?.replace('_', '.') || ''}` : 'iOS'
  }

  return 'Unknown OS'
}
