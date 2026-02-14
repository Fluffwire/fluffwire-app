/**
 * Debug utility for Tauri app debugging
 * Provides console logging and optional visual debug panel
 */

export interface DebugLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  category: string
  message: string
  data?: any
}

class DebugLogger {
  private logs: DebugLog[] = []
  private maxLogs = 100
  private listeners: Set<(logs: DebugLog[]) => void> = new Set()
  public enabled = true

  log(level: DebugLog['level'], category: string, message: string, data?: any) {
    if (!this.enabled) return

    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    }

    this.logs.push(log)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Console output with color
    const colors = {
      info: '#3b82f6',
      warn: '#f59e0b',
      error: '#ef4444',
      success: '#10b981',
    }
    console.log(
      `%c[${category}] ${message}`,
      `color: ${colors[level]}; font-weight: bold`,
      data || ''
    )

    this.notifyListeners()
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data)
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data)
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data)
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data)
  }

  getLogs(): DebugLog[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    this.notifyListeners()
  }

  subscribe(callback: (logs: DebugLog[]) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback(this.getLogs()))
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  downloadLogs() {
    const blob = new Blob([this.exportLogs()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fluffwire-debug-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export const debugLogger = new DebugLogger()

// Detect if running in Tauri 2
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

export const isTauri = !!window.__TAURI__

// Auto-enable debug mode in Tauri
if (isTauri) {
  debugLogger.info('INIT', 'Running in Tauri environment')
  debugLogger.info('INIT', 'User Agent', navigator.userAgent)
  debugLogger.info('INIT', 'Window location', window.location.href)
}
