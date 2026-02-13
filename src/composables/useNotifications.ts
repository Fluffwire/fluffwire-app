import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import type { Message } from '@/types'

const STORAGE_KEYS = {
  sound: 'fluffwire-notification-sound',
  desktop: 'fluffwire-desktop-notifications',
} as const

// Shared reactive state (singleton across all calls)
const soundEnabled = ref(localStorage.getItem(STORAGE_KEYS.sound) !== 'false')
const desktopEnabled = ref(localStorage.getItem(STORAGE_KEYS.desktop) === 'true')

function setSoundEnabled(value: boolean) {
  soundEnabled.value = value
  localStorage.setItem(STORAGE_KEYS.sound, String(value))
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
  return true
}

async function requestDesktopPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Test sound audio element (lazily created)
let testAudio: HTMLAudioElement | null = null
let testAudioReady = false

function ensureTestAudio() {
  if (testAudio) return
  testAudio = new Audio()
  testAudio.volume = 0.5
  try {
    const ctx = new OfflineAudioContext(1, 22050 * 0.3, 22050)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, 0)
    osc.frequency.setValueAtTime(1320, 0.08)
    gain.gain.setValueAtTime(0.3, 0)
    gain.gain.exponentialRampToValueAtTime(0.01, 0.25)
    osc.start(0)
    osc.stop(0.25)
    ctx.startRendering().then((buffer) => {
      const wav = audioBufferToWav(buffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      testAudio!.src = URL.createObjectURL(blob)
      testAudioReady = true
    })
  } catch {
    // OfflineAudioContext not available
  }
}

function playTestSound() {
  ensureTestAudio()
  if (!testAudio || !testAudioReady) return
  testAudio.currentTime = 0
  testAudio.play().catch(() => {})
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

  // Pre-load notification sound using a tiny synthesized ping (base64 mp3)
  // This is a minimal ~0.2s notification chime
  const audio = new Audio()
  audio.volume = 0.5

  // Generate notification sound using Web Audio API
  let audioReady = false
  try {
    const ctx = new OfflineAudioContext(1, 22050 * 0.3, 22050)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, 0)
    osc.frequency.setValueAtTime(1320, 0.08)
    gain.gain.setValueAtTime(0.3, 0)
    gain.gain.exponentialRampToValueAtTime(0.01, 0.25)
    osc.start(0)
    osc.stop(0.25)
    ctx.startRendering().then((buffer) => {
      const wav = audioBufferToWav(buffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      audio.src = URL.createObjectURL(blob)
      audioReady = true
    })
  } catch {
    // OfflineAudioContext not available — sound won't play
  }

  function playSound() {
    if (!soundEnabled.value || !audioReady) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  function showDesktopNotification(message: Message) {
    if (!desktopEnabled.value) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const title = message.author.displayName
    const body = message.content.length > 100
      ? message.content.slice(0, 100) + '...'
      : message.content

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

    playSound()
    showDesktopNotification(message)
  }

  wsDispatcher.register(WS_EVENTS.MESSAGE_CREATE, handler)
}

/** Convert an AudioBuffer to a WAV ArrayBuffer */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitsPerSample = 16
  const samples = buffer.getChannelData(0)
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = samples.length * numChannels * (bitsPerSample / 8)
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const arrayBuffer = new ArrayBuffer(totalSize)
  const view = new DataView(arrayBuffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Write samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return arrayBuffer
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
