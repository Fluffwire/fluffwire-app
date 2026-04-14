import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVoiceStore } from '@/stores/voice'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    VOICE_STATE_UPDATE: 'VOICE_STATE_UPDATE',
    VOICE_STATES_SYNC: 'VOICE_STATES_SYNC',
    VOICE_SIGNAL: 'VOICE_SIGNAL',
    VOICE_INVITE: 'VOICE_INVITE',
    VOICE_INVITE_ERROR: 'VOICE_INVITE_ERROR',
    READY: 'READY',
  },
}))

vi.mock('@/services/webrtc', () => ({
  webrtcService: {
    joinVoiceChannel: vi.fn().mockResolvedValue(undefined),
    leaveVoiceChannel: vi.fn().mockResolvedValue(undefined),
    toggleMute: vi.fn().mockReturnValue(true),
    toggleDeafen: vi.fn().mockReturnValue(true),
    startScreenShare: vi.fn().mockResolvedValue(undefined),
    stopScreenShare: vi.fn().mockResolvedValue(undefined),
    setVoiceMode: vi.fn(),
    setVadThreshold: vi.fn(),
    saveVoiceSettings: vi.fn(),
    handleSignal: vi.fn(),
    setPttActive: vi.fn(),
    onPeerSpeaking: null,
    onRemoteVideoStream: null,
    onRemoteVideoRemoved: null,
    onLocalScreenShareStopped: null,
  },
}))

vi.mock('@/composables/useSounds', () => ({
  soundManager: { play: vi.fn() },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'me' } }),
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ isFetched: false, updateSetting: vi.fn() }),
}))

vi.mock('@/utils/platform', () => ({
  isTauri: () => false,
}))

// Prevent dynamic import of vue-sonner from erroring
vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn() },
}))

function makeVoiceState(userId: string, channelId: string | null, opts: Partial<{
  selfMute: boolean; selfDeaf: boolean; streaming: boolean
}> = {}) {
  return {
    userId,
    channelId,
    username: `user-${userId}`,
    displayName: `User ${userId}`,
    avatar: null,
    selfMute: opts.selfMute ?? false,
    selfDeaf: opts.selfDeaf ?? false,
    streaming: opts.streaming ?? false,
  }
}

describe('voice store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts with no active channel and no peers', () => {
    const store = useVoiceStore()
    expect(store.currentChannelId).toBeNull()
    expect(store.peers).toEqual([])
    expect(store.isInVoice).toBe(false)
  })

  it('getVoiceChannelMembers returns empty array for unknown channel', () => {
    const store = useVoiceStore()
    expect(store.getVoiceChannelMembers('ch1')).toEqual([])
  })

  // WS VOICE_STATE_UPDATE — join
  it('WS VOICE_STATE_UPDATE adds peer to channel map when joining', () => {
    useVoiceStore()
    const store = useVoiceStore()
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u1', 'ch1'))
    expect(store.getVoiceChannelMembers('ch1')).toHaveLength(1)
    expect(store.getVoiceChannelMembers('ch1')[0].userId).toBe('u1')
  })

  it('WS VOICE_STATE_UPDATE adds peer to peers when in same channel', () => {
    useVoiceStore()
    const store = useVoiceStore()
    store.currentChannelId = 'ch1'
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u2', 'ch1'))
    expect(store.peers).toHaveLength(1)
    expect(store.peers[0].userId).toBe('u2')
  })

  it('WS VOICE_STATE_UPDATE updates existing peer in current channel', () => {
    useVoiceStore()
    const store = useVoiceStore()
    store.currentChannelId = 'ch1'
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u2', 'ch1'))
    wsHandlers.get('VOICE_STATE_UPDATE')!({ ...makeVoiceState('u2', 'ch1'), selfMute: true })
    expect(store.peers).toHaveLength(1)
    expect(store.peers[0].selfMute).toBe(true)
  })

  // WS VOICE_STATE_UPDATE — leave (channelId: null)
  it('WS VOICE_STATE_UPDATE removes peer from channel map when leaving', () => {
    useVoiceStore()
    const store = useVoiceStore()
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u1', 'ch1'))
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u1', null))
    expect(store.getVoiceChannelMembers('ch1')).toHaveLength(0)
  })

  it('WS VOICE_STATE_UPDATE removes peer from current channel peers when leaving', () => {
    useVoiceStore()
    const store = useVoiceStore()
    store.currentChannelId = 'ch1'
    store.peers.push({ userId: 'u2', username: 'u2', displayName: 'U2', avatar: null, selfMute: false, selfDeaf: false, speaking: false, streaming: false })
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u2', null))
    expect(store.peers).toHaveLength(0)
  })

  it('WS VOICE_STATE_UPDATE moves user between channels in the map', () => {
    useVoiceStore()
    const store = useVoiceStore()
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u1', 'ch1'))
    wsHandlers.get('VOICE_STATE_UPDATE')!(makeVoiceState('u1', 'ch2'))
    expect(store.getVoiceChannelMembers('ch1')).toHaveLength(0)
    expect(store.getVoiceChannelMembers('ch2')).toHaveLength(1)
  })

  // VOICE_STATES_SYNC
  it('WS VOICE_STATES_SYNC populates voiceChannelMembers', () => {
    useVoiceStore()
    const store = useVoiceStore()
    wsHandlers.get('VOICE_STATES_SYNC')!({
      voiceStates: [
        makeVoiceState('u1', 'ch1'),
        makeVoiceState('u2', 'ch1'),
        makeVoiceState('u3', 'ch2'),
      ],
    })
    expect(store.getVoiceChannelMembers('ch1')).toHaveLength(2)
    expect(store.getVoiceChannelMembers('ch2')).toHaveLength(1)
  })

  it('setInitialVoiceStates groups states by channel', () => {
    const store = useVoiceStore()
    store.setInitialVoiceStates([
      { userId: 'u1', username: 'u1', displayName: 'U1', avatar: null, channelId: 'ch1', selfMute: false, selfDeaf: false, streaming: false },
      { userId: 'u2', username: 'u2', displayName: 'U2', avatar: null, channelId: 'ch1', selfMute: false, selfDeaf: false, streaming: false },
      { userId: 'u3', username: 'u3', displayName: 'U3', avatar: null, channelId: 'ch2', selfMute: false, selfDeaf: false, streaming: false },
    ])
    expect(store.getVoiceChannelMembers('ch1')).toHaveLength(2)
    expect(store.getVoiceChannelMembers('ch2')).toHaveLength(1)
  })

  // Invites
  it('WS VOICE_INVITE adds invite and deduplicates', async () => {
    useVoiceStore()
    const store = useVoiceStore()
    const invite = { inviterId: 'u1', channelId: 'ch1', inviterName: 'User1', channelName: 'voice' }
    wsHandlers.get('VOICE_INVITE')!(invite)
    wsHandlers.get('VOICE_INVITE')!(invite) // duplicate
    expect(store.activeInvites).toHaveLength(1)
  })

  it('dismissInvite removes invite', () => {
    useVoiceStore()
    const store = useVoiceStore()
    store.activeInvites.push(
      { inviterId: 'u1', channelId: 'ch1', inviterName: 'U1', channelName: 'voice' },
      { inviterId: 'u2', channelId: 'ch1', inviterName: 'U2', channelName: 'voice' },
    )
    store.dismissInvite('u1', 'ch1')
    expect(store.activeInvites).toHaveLength(1)
    expect(store.activeInvites[0].inviterId).toBe('u2')
  })

  // Voice settings
  it('setVoiceMode updates voiceMode and persists to localStorage', () => {
    const store = useVoiceStore()
    store.setVoiceMode('push-to-talk')
    expect(store.voiceMode).toBe('push-to-talk')
    expect(localStorage.getItem('fluffwire-voice-settings')).toContain('push-to-talk')
  })

  it('setVadThreshold updates threshold and persists', () => {
    const store = useVoiceStore()
    store.setVadThreshold(42)
    expect(store.vadThreshold).toBe(42)
    expect(localStorage.getItem('fluffwire-voice-settings')).toContain('42')
  })

  it('setPttKey updates key and persists', () => {
    const store = useVoiceStore()
    store.setPttKey('KeyF')
    expect(store.pttKey).toBe('KeyF')
    expect(localStorage.getItem('fluffwire-voice-settings')).toContain('KeyF')
  })

  // Join / leave
  it('joinChannel sets currentChannelId on success', async () => {
    const store = useVoiceStore()
    await store.joinChannel('s1', 'ch1')
    expect(store.currentChannelId).toBe('ch1')
    expect(store.currentServerId).toBe('s1')
    expect(store.isInVoice).toBe(true)
    expect(store.isConnecting).toBe(false)
  })

  it('joinChannel resets state on failure', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    vi.mocked(webrtcService.joinVoiceChannel).mockRejectedValueOnce(new Error('No mic'))

    const store = useVoiceStore()
    await expect(store.joinChannel('s1', 'ch1')).rejects.toThrow()
    expect(store.currentChannelId).toBeNull()
    expect(store.isConnecting).toBe(false)
  })

  it('leaveChannel clears state', async () => {
    const store = useVoiceStore()
    store.currentChannelId = 'ch1'
    store.currentServerId = 's1'
    await store.leaveChannel()
    expect(store.currentChannelId).toBeNull()
    expect(store.currentServerId).toBeNull()
    expect(store.peers).toEqual([])
  })

  // Mute / deafen
  it('toggleMute calls webrtcService and updates isMuted', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    const store = useVoiceStore()
    store.toggleMute()
    expect(webrtcService.toggleMute).toHaveBeenCalled()
    expect(store.isMuted).toBe(true)
  })

  it('toggleDeafen sets isDeafened and forces mute', async () => {
    const { webrtcService } = await import('@/services/webrtc')
    vi.mocked(webrtcService.toggleDeafen).mockReturnValue(true)
    const store = useVoiceStore()
    store.toggleDeafen()
    expect(store.isDeafened).toBe(true)
    expect(store.isMuted).toBe(true)
  })

  // Screen share state
  it('watchStream sets watchingUserId', () => {
    const store = useVoiceStore()
    store.watchStream('u1')
    expect(store.watchingUserId).toBe('u1')
  })

  it('stopWatching clears watchingUserId', () => {
    const store = useVoiceStore()
    store.watchingUserId = 'u1'
    store.stopWatching()
    expect(store.watchingUserId).toBeNull()
  })

  it('getScreenStream returns stream for matching userId', () => {
    const store = useVoiceStore()
    const mockStream = {} as MediaStream
    store.activeScreenShare = { userId: 'u1', stream: mockStream }
    expect(store.getScreenStream('u1')).toStrictEqual(mockStream)
    expect(store.getScreenStream('u2')).toBeNull()
  })

  it('toggleSelfView flips showSelfStream', () => {
    const store = useVoiceStore()
    expect(store.showSelfStream).toBe(false)
    store.toggleSelfView()
    expect(store.showSelfStream).toBe(true)
    store.toggleSelfView()
    expect(store.showSelfStream).toBe(false)
  })
})
