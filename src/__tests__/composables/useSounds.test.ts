import { describe, it, expect, vi, beforeEach } from 'vitest'

// useSounds uses OfflineAudioContext + Audio at module init.
// In jsdom these aren't available, so init() silently catches the error
// and no sounds are ever 'ready'. We test the state-management API directly.

describe('soundManager', () => {
  beforeEach(async () => {
    // Reset enabled state before each test
    const { soundManager } = await import('@/composables/useSounds')
    soundManager.setEnabled(true)
    vi.clearAllMocks()
  })

  it('enabled defaults to true', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    expect(soundManager.enabled).toBe(true)
  })

  it('setEnabled(false) disables sound playback', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    soundManager.setEnabled(false)
    expect(soundManager.enabled).toBe(false)
  })

  it('setEnabled(true) re-enables sound playback', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    soundManager.setEnabled(false)
    soundManager.setEnabled(true)
    expect(soundManager.enabled).toBe(true)
  })

  it('play is safe when disabled (no throw)', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    soundManager.setEnabled(false)
    expect(() => soundManager.play('notification')).not.toThrow()
  })

  it('play is safe when sound not ready (no throw)', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    soundManager.setEnabled(true)
    // OfflineAudioContext unavailable in jsdom → sounds never ready → play() returns early
    expect(() => soundManager.play('voiceJoin')).not.toThrow()
  })

  it('getAudio returns undefined when sound not ready', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    // No sounds can be ready in jsdom (OfflineAudioContext unavailable)
    expect(soundManager.getAudio('notification')).toBeUndefined()
    expect(soundManager.getAudio('voiceJoin')).toBeUndefined()
  })

  it('getAudio returns undefined for every sound name', async () => {
    const { soundManager } = await import('@/composables/useSounds')
    const names = ['voiceLeave', 'voiceDisconnect', 'voiceMute', 'voiceUnmute', 'streamStart', 'streamStop', 'friendRequest'] as const
    for (const name of names) {
      expect(soundManager.getAudio(name)).toBeUndefined()
    }
  })
})
