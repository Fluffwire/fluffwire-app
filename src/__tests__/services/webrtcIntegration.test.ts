/**
 * WebRTC integration tests with mocked browser APIs.
 * Tests the state-management and signaling logic in WebRTCService
 * without requiring a real browser WebRTC stack.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/websocket', () => ({
  wsService: { send: vi.fn(), sendDispatch: vi.fn() },
}))

// ── Mock browser APIs used by WebRTCService ──────────────────────────────────

const mockAudioTrack = {
  enabled: true,
  kind: 'audio',
  stop: vi.fn(),
  onended: null,
}

const mockStream = {
  id: 'local-stream',
  getAudioTracks: vi.fn(() => [mockAudioTrack]),
  getTracks: vi.fn(() => [mockAudioTrack]),
  onremovetrack: null,
}

const mockVideoTrack = {
  enabled: true,
  kind: 'video',
  stop: vi.fn(),
  onended: null as ((this: MediaStreamTrack, ev: Event) => unknown) | null,
  onmute: null,
  onunmute: null,
  contentHint: 'screen',
}

const mockScreenStream = {
  id: 'screen-stream-me',
  getTracks: vi.fn(() => [mockVideoTrack]),
  getVideoTracks: vi.fn(() => [mockVideoTrack]),
  onremovetrack: null,
}

// RTCPeerConnection mock
let mockPC: {
  signalingState: string
  connectionState: string
  iceConnectionState: string
  ontrack: ((event: unknown) => void) | null
  onconnectionstatechange: (() => void) | null
  oniceconnectionstatechange: (() => void) | null
  onicecandidate: ((event: unknown) => void) | null
  addTrack: ReturnType<typeof vi.fn>
  removeTrack: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  createOffer: ReturnType<typeof vi.fn>
  createAnswer: ReturnType<typeof vi.fn>
  setLocalDescription: ReturnType<typeof vi.fn>
  setRemoteDescription: ReturnType<typeof vi.fn>
  addIceCandidate: ReturnType<typeof vi.fn>
  getSenders: ReturnType<typeof vi.fn>
}

function createMockPC() {
  return {
    signalingState: 'stable',
    connectionState: 'connected',
    iceConnectionState: 'connected',
    ontrack: null,
    onconnectionstatechange: null,
    oniceconnectionstatechange: null,
    onicecandidate: null,
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    close: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    getSenders: vi.fn().mockReturnValue([]),
  }
}

const mockAudioEl = {
  autoplay: false,
  muted: false,
  srcObject: null as unknown,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
}

const mockAnalyser = {
  fftSize: 256,
  frequencyBinCount: 128,
  smoothingTimeConstant: 0.8,
  getByteFrequencyData: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}

const mockAudioCtx = {
  state: 'running',
  close: vi.fn().mockResolvedValue(undefined),
  createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() }),
  createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
}

beforeEach(() => {
  mockPC = createMockPC()
  vi.clearAllMocks()
  localStorage.clear()

  vi.stubGlobal('RTCPeerConnection', vi.fn(function () { return mockPC }))
  vi.stubGlobal('RTCSessionDescription', vi.fn(function (init: RTCSessionDescriptionInit) { return init }))
  vi.stubGlobal('RTCIceCandidate', vi.fn(function (init: RTCIceCandidateInit) { return init }))
  vi.stubGlobal('AudioContext', vi.fn(function () { return mockAudioCtx }))
  vi.stubGlobal('Audio', vi.fn(function () { return mockAudioEl }))
  vi.stubGlobal('requestAnimationFrame', vi.fn()) // prevent recursive RAF loop

  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
      getDisplayMedia: vi.fn().mockResolvedValue(mockScreenStream),
    },
    configurable: true,
    writable: true,
  })

  // jsdom's HTMLMediaElement.play()/pause() are not implemented — mock them
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    value: vi.fn().mockResolvedValue(undefined),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  })
})

afterEach(async () => {
  const { webrtcService } = await import('@/services/webrtc')
  await webrtcService.leaveVoiceChannel()
  vi.unstubAllGlobals()
})

describe('webrtcService — integration with mocked browser APIs', () => {
  it('joinVoiceChannel sets currentChannelId and creates RTCPeerConnection', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    expect(webrtcService.currentChannelId).toBe('ch1')
    expect(RTCPeerConnection).toHaveBeenCalled()
  })

  it('joinVoiceChannel sends initial voice state + offer via WS', async () => {
    const { wsService } = await import('@/services/websocket')
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    expect(wsService.send).toHaveBeenCalledWith(expect.objectContaining({ op: 4 }))
    expect(wsService.sendDispatch).toHaveBeenCalledWith('VOICE_SIGNAL', expect.objectContaining({ type: 'offer' }))
  })

  it('leaveVoiceChannel closes peer connection and resets state', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    await webrtcService.leaveVoiceChannel()
    expect(mockPC.close).toHaveBeenCalled()
    expect(webrtcService.currentChannelId).toBeNull()
  })

  it('leaveVoiceChannel sends null channelId to server', async () => {
    const { wsService } = await import('@/services/websocket')
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    vi.clearAllMocks()
    await webrtcService.leaveVoiceChannel()
    expect(wsService.send).toHaveBeenCalledWith(expect.objectContaining({
      d: expect.objectContaining({ channelId: null }),
    }))
  })

  it('toggleMute with active stream disables audio track', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    // Reset track state
    mockAudioTrack.enabled = true
    webrtcService.toggleMute()
    expect(mockAudioTrack.enabled).toBe(false)
  })

  it('toggleMute unmute re-enables audio track', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    // The singleton may carry _isMuted state from previous test — ensure we start unmuted
    if (webrtcService.isMuted) webrtcService.toggleMute()
    mockAudioTrack.enabled = true
    webrtcService.toggleMute() // mute
    webrtcService.toggleMute() // unmute
    expect(mockAudioTrack.enabled).toBe(true)
  })

  it('handleSignal offer: sets remote description and sends answer', async () => {
    const { wsService } = await import('@/services/websocket')
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    vi.clearAllMocks()

    await webrtcService.handleSignal({
      type: 'offer',
      payload: { type: 'offer', sdp: 'remote-offer-sdp' } as RTCSessionDescriptionInit,
      channelId: 'ch1',
    })
    // Wait for the signal queue to settle
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockPC.setRemoteDescription).toHaveBeenCalled()
    expect(mockPC.createAnswer).toHaveBeenCalled()
    expect(mockPC.setLocalDescription).toHaveBeenCalled()
    expect(wsService.sendDispatch).toHaveBeenCalledWith('VOICE_SIGNAL', expect.objectContaining({ type: 'answer' }))
  })

  it('handleSignal answer: sets remote description', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    mockPC.signalingState = 'have-local-offer'

    await webrtcService.handleSignal({
      type: 'answer',
      payload: { type: 'answer', sdp: 'answer-sdp' } as RTCSessionDescriptionInit,
      channelId: 'ch1',
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockPC.setRemoteDescription).toHaveBeenCalled()
  })

  it('handleSignal ice-candidate: buffers when no remote description yet', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    // hasRemoteDescription starts false → candidate goes to buffer
    await webrtcService.handleSignal({
      type: 'ice-candidate',
      payload: { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidateInit,
      channelId: 'ch1',
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    // Buffered, not added yet
    expect(mockPC.addIceCandidate).not.toHaveBeenCalled()
  })

  it('handleSignal ice-candidate: adds directly after remote description set', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')

    // First set remote description via answer
    mockPC.signalingState = 'have-local-offer'
    await webrtcService.handleSignal({
      type: 'answer',
      payload: { type: 'answer', sdp: 'answer-sdp' } as RTCSessionDescriptionInit,
      channelId: 'ch1',
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    // Now add ICE candidate
    await webrtcService.handleSignal({
      type: 'ice-candidate',
      payload: { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidateInit,
      channelId: 'ch1',
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockPC.addIceCandidate).toHaveBeenCalled()
  })

  it('handleSignal buffers when peerConnection is null', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    // Don't join → peerConnection is null
    await webrtcService.handleSignal({
      type: 'offer',
      payload: { type: 'offer', sdp: 'sdp' } as RTCSessionDescriptionInit,
      channelId: 'ch1',
    })
    // No error, buffered for later
    expect(mockPC.setRemoteDescription).not.toHaveBeenCalled()
  })

  it('startScreenShare sets isScreenSharing and sends screen-share signal', async () => {
    const { wsService } = await import('@/services/websocket')
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    vi.clearAllMocks()

    await webrtcService.startScreenShare()

    expect(webrtcService.isScreenSharing).toBe(true)
    expect(wsService.sendDispatch).toHaveBeenCalledWith('VOICE_SIGNAL', expect.objectContaining({ type: 'screen-share' }))
    expect(mockPC.addTrack).toHaveBeenCalled()
  })

  it('stopScreenShare clears isScreenSharing and sends screen-stop signal', async () => {
    const { wsService } = await import('@/services/websocket')
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    await webrtcService.startScreenShare()
    vi.clearAllMocks()

    await webrtcService.stopScreenShare()

    expect(webrtcService.isScreenSharing).toBe(false)
    expect(wsService.sendDispatch).toHaveBeenCalledWith('VOICE_SIGNAL', expect.objectContaining({ type: 'screen-stop' }))
  })

  it('ontrack callback for remote audio stream updates audio element', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')

    const createElementSpy = vi.spyOn(document, 'createElement')

    // Simulate an incoming audio track event
    const remoteTrack = { kind: 'audio', onended: null }
    const remoteStream = {
      id: 'stream-u2',
      getTracks: vi.fn(() => [remoteTrack]),
      onremovetrack: null,
    }
    const trackEvent = {
      streams: [remoteStream],
      track: remoteTrack,
    }

    // Trigger the ontrack handler manually
    mockPC.ontrack?.(trackEvent)

    // The handler sets up audio playback via document.createElement('audio')
    expect(createElementSpy).toHaveBeenCalledWith('audio')
  })

  it('ontrack callback for screen stream calls onRemoteVideoStream', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')

    const onRemoteVideo = vi.fn()
    webrtcService.onRemoteVideoStream = onRemoteVideo

    const screenTrack = { kind: 'video', onended: null }
    const screenStream = {
      id: 'screen-stream-u2',
      getTracks: vi.fn(() => [screenTrack]),
      onremovetrack: null,
    }

    mockPC.ontrack?.({ streams: [screenStream], track: screenTrack })

    expect(onRemoteVideo).toHaveBeenCalledWith('u2', screenStream)
  })

  it('onicecandidate callback sends ice-candidate signal', async () => {
    const { wsService } = await import('@/services/websocket')
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    vi.clearAllMocks()

    mockPC.onicecandidate?.({
      candidate: { toJSON: () => ({ candidate: 'a=ice-candidate', sdpMid: '0', sdpMLineIndex: 0 }) },
    })

    expect(wsService.sendDispatch).toHaveBeenCalledWith('VOICE_SIGNAL', expect.objectContaining({ type: 'ice-candidate' }))
  })

  it('setupVoiceActivityDetection creates AudioContext', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    expect(AudioContext).toHaveBeenCalled()
  })

  it('leaveVoiceChannel while screen sharing stops tracks', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    await webrtcService.startScreenShare()
    await webrtcService.leaveVoiceChannel()
    expect(mockVideoTrack.stop).toHaveBeenCalled()
  })

  it('getPeerConnection returns the active peer connection', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    await webrtcService.joinVoiceChannel('s1', 'ch1')
    expect(webrtcService.getPeerConnection()).toBe(mockPC)
  })
})
