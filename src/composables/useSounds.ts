/** Centralized sound synthesis singleton */

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

interface SoundDef {
  sampleRate: number
  duration: number
  build: (ctx: OfflineAudioContext) => void
}

const SOUND_DEFS: Record<string, SoundDef> = {
  notification: {
    sampleRate: 22050,
    duration: 0.3,
    build(ctx) {
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
    },
  },
  friendRequest: {
    sampleRate: 22050,
    duration: 0.35,
    build(ctx) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(660, 0)
      osc.frequency.linearRampToValueAtTime(880, 0.15)
      gain.gain.setValueAtTime(0.25, 0)
      gain.gain.exponentialRampToValueAtTime(0.01, 0.3)
      osc.start(0)
      osc.stop(0.3)
    },
  },
  voiceJoin: {
    sampleRate: 22050,
    duration: 0.2,
    build(ctx) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, 0)
      osc.frequency.linearRampToValueAtTime(660, 0.15)
      gain.gain.setValueAtTime(0.25, 0)
      gain.gain.exponentialRampToValueAtTime(0.01, 0.15)
      osc.start(0)
      osc.stop(0.15)
    },
  },
  voiceLeave: {
    sampleRate: 22050,
    duration: 0.2,
    build(ctx) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(660, 0)
      osc.frequency.linearRampToValueAtTime(440, 0.15)
      gain.gain.setValueAtTime(0.25, 0)
      gain.gain.exponentialRampToValueAtTime(0.01, 0.15)
      osc.start(0)
      osc.stop(0.15)
    },
  },
}

type SoundName = keyof typeof SOUND_DEFS

class SoundManager {
  private sounds = new Map<string, HTMLAudioElement>()
  private ready = new Set<string>()
  private _enabled = true

  constructor() {
    this.init()
  }

  private init() {
    try {
      for (const [name, def] of Object.entries(SOUND_DEFS)) {
        const audio = new Audio()
        audio.volume = 0.5
        this.sounds.set(name, audio)

        const ctx = new OfflineAudioContext(1, def.sampleRate * def.duration, def.sampleRate)
        def.build(ctx)
        ctx.startRendering().then((buffer) => {
          const wav = audioBufferToWav(buffer)
          const blob = new Blob([wav], { type: 'audio/wav' })
          audio.src = URL.createObjectURL(blob)
          this.ready.add(name)
        })
      }
    } catch {
      // OfflineAudioContext not available
    }
  }

  play(name: SoundName) {
    if (!this._enabled) return
    const audio = this.sounds.get(name)
    if (!audio || !this.ready.has(name)) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled
  }

  get enabled() {
    return this._enabled
  }

  /** Get audio element for test playback in settings */
  getAudio(name: SoundName): HTMLAudioElement | undefined {
    if (!this.ready.has(name)) return undefined
    return this.sounds.get(name)
  }
}

export const soundManager = new SoundManager()
