import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/websocket', () => ({
  wsService: { send: vi.fn(), sendDispatch: vi.fn() },
}))

describe('webrtcService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('setVadThreshold clamps to 0-100', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    webrtcService.setVadThreshold(150)
    expect(webrtcService.vadThreshold).toBe(100)
    webrtcService.setVadThreshold(-10)
    expect(webrtcService.vadThreshold).toBe(0)
    webrtcService.setVadThreshold(50)
    expect(webrtcService.vadThreshold).toBe(50)
  })

  it('setVoiceMode updates voiceMode getter', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    webrtcService.setVoiceMode('push-to-talk')
    expect(webrtcService.voiceMode).toBe('push-to-talk')
    webrtcService.setVoiceMode('voice-activity')
    expect(webrtcService.voiceMode).toBe('voice-activity')
  })

  it('toggleMute flips isMuted and returns new value', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    expect(webrtcService.isMuted).toBe(false)
    const muted = webrtcService.toggleMute()
    expect(muted).toBe(true)
    expect(webrtcService.isMuted).toBe(true)
    const unmuted = webrtcService.toggleMute()
    expect(unmuted).toBe(false)
  })

  it('toggleDeafen flips isDeafened and returns new value', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    expect(webrtcService.isDeafened).toBe(false)
    const deafened = webrtcService.toggleDeafen()
    expect(deafened).toBe(true)
    expect(webrtcService.isDeafened).toBe(true)
  })

  it('saveVoiceSettings persists to localStorage', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    webrtcService.setVadThreshold(42)
    webrtcService.saveVoiceSettings()
    const stored = JSON.parse(localStorage.getItem('fluffwire-voice-settings') ?? '{}')
    expect(stored.vadThreshold).toBe(42)
  })

  it('loadVoiceSettings restores from localStorage', async () => {
    localStorage.setItem('fluffwire-voice-settings', JSON.stringify({
      voiceMode: 'push-to-talk',
      vadThreshold: 30,
    }))
    const { webrtcService } = await import('@/services/webrtc')
    webrtcService.loadVoiceSettings()
    expect(webrtcService.voiceMode).toBe('push-to-talk')
    expect(webrtcService.vadThreshold).toBe(30)
  })

  it('loadVoiceSettings silently ignores malformed JSON', async () => {
    localStorage.setItem('fluffwire-voice-settings', 'not-json')
    const { webrtcService } = await import('@/services/webrtc')
    // Should not throw
    expect(() => webrtcService.loadVoiceSettings()).not.toThrow()
  })

  it('setPttActive sets ptt state (no-op when no localStream)', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    // no localStream → updateTrackEnabled returns early, no error
    expect(() => webrtcService.setPttActive(true)).not.toThrow()
    expect(() => webrtcService.setPttActive(false)).not.toThrow()
  })

  it('isScreenSharing starts as false', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    expect(webrtcService.isScreenSharing).toBe(false)
  })

  it('currentChannelId starts as null', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    expect(webrtcService.currentChannelId).toBeNull()
  })

  it('leaveVoiceChannel is safe when not connected', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    // No peer connection / stream — should not throw
    await expect(webrtcService.leaveVoiceChannel()).resolves.toBeUndefined()
  })

  it('getPeerConnection returns null when not connected', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    expect(webrtcService.getPeerConnection()).toBeNull()
  })
})
