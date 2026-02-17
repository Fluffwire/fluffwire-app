import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVoiceStore } from '@/stores/voice'
import type { VoiceSignal } from '@/types'

// Mock the WebRTC service
vi.mock('@/services/webrtc', () => ({
  webrtcService: {
    onRemoteVideoStream: null as ((userId: string, stream: MediaStream) => void) | null,
    onRemoteVideoRemoved: null as ((userId: string) => void) | null,
    onPeerSpeaking: null as ((userId: string, speaking: boolean) => void) | null,
    joinVoiceChannel: vi.fn().mockResolvedValue(undefined),
    leaveVoiceChannel: vi.fn().mockResolvedValue(undefined),
    handleSignal: vi.fn().mockResolvedValue(undefined),
    toggleMute: vi.fn(() => false),
    toggleDeafen: vi.fn(() => false),
    setVoiceMode: vi.fn(),
    setVadThreshold: vi.fn(),
    saveVoiceSettings: vi.fn(),
    startScreenShare: vi.fn().mockResolvedValue(undefined),
    stopScreenShare: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock WebSocket dispatcher
vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn(),
  },
  WS_EVENTS: {
    VOICE_STATE_UPDATE: 'VOICE_STATE_UPDATE',
    VOICE_SIGNAL: 'VOICE_SIGNAL',
    VOICE_INVITE: 'VOICE_INVITE',
    VOICE_INVITE_ERROR: 'VOICE_INVITE_ERROR',
    READY: 'READY',
  },
}))

// Mock sound manager
vi.mock('@/composables/useSounds', () => ({
  soundManager: {
    play: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'local-user-id', username: 'testuser', displayName: 'Test User' },
  })),
}))

describe('Screen Share Integration', () => {
  let voiceStore: ReturnType<typeof useVoiceStore>
  let mockStream: MediaStream
  let mockVideoTrack: MediaStreamTrack

  beforeEach(() => {
    setActivePinia(createPinia())
    voiceStore = useVoiceStore()

    // Mock MediaStreamTrack
    mockVideoTrack = {
      id: 'screen-track-123',
      kind: 'video',
      readyState: 'live',
      enabled: true,
      muted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      stop: vi.fn(),
    } as unknown as MediaStreamTrack

    // Mock MediaStream
    mockStream = {
      id: 'screen-stream-user-123',
      getTracks: vi.fn(() => [mockVideoTrack]),
      getVideoTracks: vi.fn(() => [mockVideoTrack]),
      getAudioTracks: vi.fn(() => []),
    } as unknown as MediaStream
  })

  it('should receive screen stream and update store', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    // Simulate receiving a screen stream
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }

    // Store should be updated
    expect(voiceStore.activeScreenShare).toEqual({
      userId: 'user-123',
      stream: mockStream,
    })
  })

  it('should auto-watch screen share when received', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    expect(voiceStore.watchingUserId).toBeNull()

    // Simulate receiving a screen stream
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }

    // Should auto-watch
    expect(voiceStore.watchingUserId).toBe('user-123')
  })

  it('should not auto-watch if already watching someone', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    // Manually set watching user
    voiceStore.watchStream('other-user')
    expect(voiceStore.watchingUserId).toBe('other-user')

    // Receive screen stream from different user
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }

    // Should NOT auto-watch (already watching someone)
    expect(voiceStore.watchingUserId).toBe('other-user')
  })

  it('should clear screen stream when removed', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    // Add screen stream
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }

    expect(voiceStore.activeScreenShare).not.toBeNull()

    // Remove screen stream
    if (webrtcService.onRemoteVideoRemoved) {
      webrtcService.onRemoteVideoRemoved('user-123')
    }

    // Should be cleared
    expect(voiceStore.activeScreenShare).toBeNull()
  })

  it('should stop watching when screen share removed', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    // Add and watch screen stream
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }
    expect(voiceStore.watchingUserId).toBe('user-123')

    // Remove screen stream
    if (webrtcService.onRemoteVideoRemoved) {
      webrtcService.onRemoteVideoRemoved('user-123')
    }

    // Should stop watching
    expect(voiceStore.watchingUserId).toBeNull()
  })

  it('should replace existing screen share (only one at a time)', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    const firstStream = { ...mockStream, id: 'screen-stream-user-1' } as MediaStream
    const secondStream = { ...mockStream, id: 'screen-stream-user-2' } as MediaStream

    // First user starts sharing
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-1', firstStream)
    }
    expect(voiceStore.activeScreenShare?.userId).toBe('user-1')

    // Second user starts sharing (should replace)
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-2', secondStream)
    }

    // Should only have second user's stream
    expect(voiceStore.activeScreenShare?.userId).toBe('user-2')
    expect(voiceStore.activeScreenShare?.stream.id).toBe(secondStream.id)
  })

  it('should get screen stream by user ID', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    // No stream initially
    expect(voiceStore.getScreenStream('user-123')).toBeNull()

    // Add stream
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }

    // Should return stream for correct user
    const stream = voiceStore.getScreenStream('user-123')
    expect(stream).toBeTruthy()
    expect(stream?.id).toBe(mockStream.id)

    // Should return null for different user
    expect(voiceStore.getScreenStream('other-user')).toBeNull()
  })

  it('should clear screen share when leaving channel', async () => {
    const { webrtcService } = await import('@/services/webrtc')

    // Add screen stream
    if (webrtcService.onRemoteVideoStream) {
      webrtcService.onRemoteVideoStream('user-123', mockStream)
    }
    expect(voiceStore.activeScreenShare).not.toBeNull()

    // Leave channel
    await voiceStore.leaveChannel()

    // Should be cleared
    expect(voiceStore.activeScreenShare).toBeNull()
    expect(voiceStore.watchingUserId).toBeNull()
  })

  it('should manually watch and stop watching streams', () => {
    // Watch stream
    voiceStore.watchStream('user-123')
    expect(voiceStore.watchingUserId).toBe('user-123')

    // Stop watching
    voiceStore.stopWatching()
    expect(voiceStore.watchingUserId).toBeNull()
  })

  it('should toggle self-view when screen sharing', async () => {
    expect(voiceStore.showSelfStream).toBe(false)

    // Start screen share
    await voiceStore.startScreenShare()
    expect(voiceStore.showSelfStream).toBe(true)

    // Stop screen share
    await voiceStore.stopScreenShare()
    expect(voiceStore.showSelfStream).toBe(false)
  })

  it('should manually toggle self-view', () => {
    expect(voiceStore.showSelfStream).toBe(false)

    voiceStore.toggleSelfView()
    expect(voiceStore.showSelfStream).toBe(true)

    voiceStore.toggleSelfView()
    expect(voiceStore.showSelfStream).toBe(false)
  })
})
