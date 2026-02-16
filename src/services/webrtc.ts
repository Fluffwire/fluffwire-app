import { wsService } from './websocket'
import type { VoiceSignal, MediaDeviceOption } from '@/types'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:app.fluffwire.com:3478' },
    {
      urls: [
        'turn:app.fluffwire.com:3478?transport=udp',
        'turn:app.fluffwire.com:3478?transport=tcp',
        'turns:app.fluffwire.com:5349?transport=tcp',
      ],
      username: 'fluffwire',
      credential: 'TurnRelay2026!',
    },
  ],
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStreams = new Map<string, MediaStream>()
  private remoteAudioElements = new Map<string, HTMLAudioElement>()
  private audioContext: AudioContext | null = null
  private analyserNodes = new Map<string, AnalyserNode>()
  private remoteVadIntervals = new Map<string, number>()

  private screenStream: MediaStream | null = null
  private _isScreenSharing = false

  private _isMuted = false
  private _isDeafened = false
  private _currentChannelId: string | null = null
  private _currentServerId: string | null = null

  // Voice settings
  private _voiceMode: 'voice-activity' | 'push-to-talk' = 'voice-activity'
  private _vadThreshold = 15
  private _pttActive = false
  private _inputDeviceId: string | null = null
  private _outputDeviceId: string | null = null

  // ICE candidate buffer — queued until remote description is set
  private iceCandidateBuffer: RTCIceCandidateInit[] = []
  private hasRemoteDescription = false

  // Signal buffer — queued when PC is null (during rejoin)
  private pendingSignals: VoiceSignal[] = []

  // Serialise all signal handling to prevent races
  private signalQueue: Promise<void> = Promise.resolve()

  onPeerSpeaking: ((userId: string, speaking: boolean) => void) | null = null
  onRemoteStream: ((userId: string, stream: MediaStream) => void) | null = null
  onPeerDisconnected: ((userId: string) => void) | null = null
  onRemoteVideoStream: ((userId: string, stream: MediaStream) => void) | null = null
  onRemoteVideoRemoved: ((userId: string) => void) | null = null

  get isMuted(): boolean { return this._isMuted }
  get isDeafened(): boolean { return this._isDeafened }
  get isScreenSharing(): boolean { return this._isScreenSharing }
  get currentChannelId(): string | null { return this._currentChannelId }
  get voiceMode(): 'voice-activity' | 'push-to-talk' { return this._voiceMode }
  get vadThreshold(): number { return this._vadThreshold }

  setVoiceMode(mode: 'voice-activity' | 'push-to-talk') {
    this._voiceMode = mode
    if (mode === 'push-to-talk') {
      // When switching to PTT, mute track until key is held
      this._pttActive = false
      this.updateTrackEnabled()
    } else {
      this.updateTrackEnabled()
    }
  }

  setVadThreshold(threshold: number) {
    this._vadThreshold = Math.max(0, Math.min(100, threshold))
  }

  setPttActive(active: boolean) {
    this._pttActive = active
    this.updateTrackEnabled()
  }

  private updateTrackEnabled() {
    if (!this.localStream) return
    const shouldEnable = this._voiceMode === 'push-to-talk'
      ? this._pttActive && !this._isMuted
      : !this._isMuted
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = shouldEnable
    })
  }

  loadVoiceSettings() {
    try {
      const stored = localStorage.getItem('fluffwire-voice-settings')
      if (stored) {
        const s = JSON.parse(stored)
        if (s.voiceMode) this._voiceMode = s.voiceMode
        if (typeof s.vadThreshold === 'number') this._vadThreshold = s.vadThreshold
        if (s.inputDeviceId) this._inputDeviceId = s.inputDeviceId
        if (s.outputDeviceId) this._outputDeviceId = s.outputDeviceId
      }
    } catch { /* ignore parse errors */ }
  }

  saveVoiceSettings() {
    localStorage.setItem('fluffwire-voice-settings', JSON.stringify({
      voiceMode: this._voiceMode,
      vadThreshold: this._vadThreshold,
      inputDeviceId: this._inputDeviceId,
      outputDeviceId: this._outputDeviceId,
    }))
  }

  async joinVoiceChannel(serverId: string, channelId: string): Promise<void> {
    await this.leaveVoiceChannel()

    this._currentChannelId = channelId
    this._currentServerId = serverId
    this.hasRemoteDescription = false
    this.iceCandidateBuffer = []

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      this.peerConnection = new RTCPeerConnection(ICE_SERVERS)

      // Monitor connection state for disconnections
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState
        console.log('[WebRTC] Connection state:', state)

        if (state === 'failed' || state === 'disconnected') {
          console.warn('[WebRTC] Connection lost, cleaning up...')
          // Notify voice store to clear UI state
          import('@/stores/voice').then(({ useVoiceStore }) => {
            const voiceStore = useVoiceStore()
            if (state === 'failed') {
              // Connection permanently failed
              voiceStore.leaveChannel()
              import('vue-sonner').then(({ toast }) => {
                toast.error('Voice connection lost')
              })
            }
            // 'disconnected' might be temporary, wait before cleaning up
          }).catch(console.error)
        }
      }

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', this.peerConnection?.iceConnectionState)
      }

      // Apply persisted mute state to new tracks
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this._isMuted
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      this.peerConnection.ontrack = (event: RTCTrackEvent) => {
        const [stream] = event.streams
        if (!stream) return

        // Route by stream ID: "screen-stream-{userId}" → video, "stream-{userId}" → audio
        if (stream.id.startsWith('screen-stream-')) {
          const userId = stream.id.slice('screen-stream-'.length)
          this.remoteStreams.set(stream.id, stream)

          // Wait for track to be ready before notifying (prevents black screen)
          if (event.track.readyState === 'live') {
            this.onRemoteVideoStream?.(userId, stream)
          } else {
            event.track.onunmute = () => {
              this.onRemoteVideoStream?.(userId, stream)
            }
          }

          // Clean up when track ends
          event.track.onended = () => {
            this.remoteStreams.delete(stream.id)
            this.onRemoteVideoRemoved?.(userId)
          }
          stream.onremovetrack = () => {
            if (stream.getTracks().length === 0) {
              this.remoteStreams.delete(stream.id)
              this.onRemoteVideoRemoved?.(userId)
            }
          }
          return
        }

        if (!this.remoteAudioElements.has(stream.id)) {
          this.remoteStreams.set(stream.id, stream)
          this.onRemoteStream?.(stream.id, stream)

          // Create hidden audio element to play remote audio
          const audio = document.createElement('audio')
          audio.srcObject = stream
          audio.autoplay = true
          audio.muted = this._isDeafened
          audio.play().catch(() => {})
          this.remoteAudioElements.set(stream.id, audio)

          // Parse userId from Pion stream ID format: "stream-{userId}"
          const userId = stream.id.startsWith('stream-') ? stream.id.slice(7) : null
          if (userId) {
            this.setupRemoteVAD(stream, userId)
          }
        }
      }

      this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          wsService.sendDispatch('VOICE_SIGNAL', {
            type: 'ice-candidate',
            payload: event.candidate.toJSON(),
            channelId,
          } satisfies VoiceSignal & { channelId: string })
        }
      }

      // Notify server about voice state
      wsService.send({
        op: 4, // VOICE_STATE_UPDATE
        d: { serverId, channelId, selfMute: this._isMuted, selfDeaf: this._isDeafened },
      })

      // Create offer for SFU
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      wsService.sendDispatch('VOICE_SIGNAL', {
        type: 'offer',
        payload: offer,
        channelId,
      })

      // Set up voice activity detection
      this.setupVoiceActivityDetection()

      // Process any pending signals that arrived during reconnection
      const pending = this.pendingSignals
      this.pendingSignals = []
      if (pending.length > 0) {
        console.log(`[WebRTC] Processing ${pending.length} pending signals`)
        for (const signal of pending) {
          await this.handleSignal(signal)
        }
      }
    } catch (error) {
      console.error('[WebRTC] Failed to join voice channel:', error)
      await this.leaveVoiceChannel()
      throw error
    }
  }

  async handleSignal(signal: VoiceSignal): Promise<void> {
    // If PC is null (e.g., during rejoin), buffer the signal for retry
    if (!this.peerConnection) {
      console.log('[WebRTC] Buffering signal during reconnection:', signal.type)
      this.pendingSignals.push(signal)
      return
    }

    // Serialise signal handling to prevent race conditions
    this.signalQueue = this.signalQueue.then(() => this.processSignal(signal)).catch((err) => {
      console.error('[WebRTC] Signal processing error:', err)
    })
  }

  private async processSignal(signal: VoiceSignal): Promise<void> {
    if (!this.peerConnection) {
      // Should not happen due to check in handleSignal, but safety check
      this.pendingSignals.push(signal)
      return
    }

    switch (signal.type) {
      case 'answer': {
        const state = this.peerConnection.signalingState
        if (state !== 'have-local-offer') {
          console.warn(`[WebRTC] Ignoring answer in state ${state}`)
          return
        }
        const desc = new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
        await this.peerConnection.setRemoteDescription(desc)
        this.hasRemoteDescription = true
        await this.drainIceCandidateBuffer()
        break
      }
      case 'ice-candidate': {
        const candidate = signal.payload as RTCIceCandidateInit
        if (!this.hasRemoteDescription) {
          this.iceCandidateBuffer.push(candidate)
        } else {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (err) {
            console.warn('[WebRTC] Failed to add ICE candidate:', err)
          }
        }
        break
      }
      case 'offer': {
        // SFU renegotiation — server is adding/removing tracks.
        // The server always wins (impolite peer in Perfect Negotiation).
        const state = this.peerConnection.signalingState
        if (state === 'have-local-offer') {
          // Glare: we sent an offer and server sent one too. Roll back ours.
          await this.peerConnection.setLocalDescription({ type: 'rollback' })
        } else if (state !== 'stable') {
          console.warn(`[WebRTC] Cannot handle offer in state ${state}, skipping`)
          return
        }

        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
        )
        this.hasRemoteDescription = true

        // CRITICAL: Drain ICE candidates BEFORE creating answer
        // ICE candidates must be added to the remote description before negotiation
        await this.drainIceCandidateBuffer()

        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)

        wsService.sendDispatch('VOICE_SIGNAL', {
          type: 'answer',
          payload: answer,
          channelId: this._currentChannelId,
        })
        break
      }
    }
  }

  private async drainIceCandidateBuffer(): Promise<void> {
    const buffered = this.iceCandidateBuffer
    this.iceCandidateBuffer = []
    const failed: RTCIceCandidateInit[] = []

    for (const candidate of buffered) {
      try {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[WebRTC] Failed to add buffered ICE candidate, will retry:', err)
        failed.push(candidate)
      }
    }

    // Re-buffer failed candidates for next drain attempt
    if (failed.length > 0) {
      this.iceCandidateBuffer.push(...failed)
    }
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted
    this.updateTrackEnabled()
    this.sendVoiceStateUpdate()
    return this._isMuted
  }

  toggleDeafen(): boolean {
    this._isDeafened = !this._isDeafened
    if (this._isDeafened) {
      this._isMuted = true
      this.localStream?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
    }
    this.remoteAudioElements.forEach((audio) => {
      audio.muted = this._isDeafened
    })
    this.sendVoiceStateUpdate()
    return this._isDeafened
  }

  private sendVoiceStateUpdate(): void {
    if (!this._currentChannelId) return
    wsService.send({
      op: 4,
      d: {
        serverId: this._currentServerId,
        channelId: this._currentChannelId,
        selfMute: this._isMuted,
        selfDeaf: this._isDeafened,
      },
    })
  }

  async startScreenShare(): Promise<void> {
    if (!this.peerConnection || !this._currentChannelId) return

    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' } as MediaTrackConstraints,
      audio: true,
    })

    // Auto-stop when user clicks browser's "Stop sharing" button
    const videoTrack = this.screenStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.onended = () => {
        this.stopScreenShare()
      }
    }

    // Add tracks to PeerConnection
    for (const track of this.screenStream.getTracks()) {
      this.peerConnection.addTrack(track, this.screenStream)
    }

    this._isScreenSharing = true

    // Create offer with new screen tracks to ensure proper SDP negotiation
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)

    // Signal the server with the offer (ensures SDP negotiation before streaming)
    wsService.sendDispatch('VOICE_SIGNAL', {
      type: 'screen-share',
      payload: offer,
      channelId: this._currentChannelId,
    })
  }

  async stopScreenShare(): Promise<void> {
    if (!this._isScreenSharing) return

    // Remove screen tracks from peer connection
    if (this.peerConnection && this.screenStream) {
      const senders = this.peerConnection.getSenders()
      for (const track of this.screenStream.getTracks()) {
        const sender = senders.find((s) => s.track === track)
        if (sender) {
          this.peerConnection.removeTrack(sender)
        }
        track.stop()
      }
    }

    if (this._currentChannelId) {
      wsService.sendDispatch('VOICE_SIGNAL', {
        type: 'screen-stop',
        payload: {} as RTCSessionDescriptionInit,
        channelId: this._currentChannelId,
      })
    }

    this.screenStream = null
    this._isScreenSharing = false
  }

  async leaveVoiceChannel(): Promise<void> {
    // Stop screen sharing before leaving
    if (this._isScreenSharing) {
      // Stop tracks without sending screen-stop signal (leaving channel handles cleanup)
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop())
        this.screenStream = null
      }
      this._isScreenSharing = false
    }

    if (this._currentChannelId) {
      wsService.send({
        op: 4,
        d: { serverId: this._currentServerId, channelId: null, selfMute: false, selfDeaf: false },
      })
    }

    this.peerConnection?.close()
    this.peerConnection = null

    this.localStream?.getTracks().forEach((track) => track.stop())
    this.localStream = null

    this.remoteStreams.clear()
    this.remoteAudioElements.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
    })
    this.remoteAudioElements.clear()
    this.analyserNodes.clear()
    this.remoteVadIntervals.forEach((id) => clearInterval(id))
    this.remoteVadIntervals.clear()
    this.audioContext?.close()
    this.audioContext = null

    this._currentChannelId = null
    this._currentServerId = null
    // Persist mute/deafen state across leave/join
    this.hasRemoteDescription = false
    // ICE buffer is already cleared in joinVoiceChannel, don't double-clear here
  }

  private setupRemoteVAD(stream: MediaStream, userId: string): void {
    if (!this.audioContext) return
    try {
      const source = this.audioContext.createMediaStreamSource(stream)
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let wasSpeaking = false

      const intervalId = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const isSpeaking = avg > 15

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking
          this.onPeerSpeaking?.(userId, isSpeaking)
        }
      }, 50)

      this.remoteVadIntervals.set(userId, intervalId)
    } catch {
      // AudioContext may not support this stream
    }
  }

  private setupVoiceActivityDetection(): void {
    if (!this.localStream) return

    this.audioContext = new AudioContext()
    const source = this.audioContext.createMediaStreamSource(this.localStream)
    const analyser = this.audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let wasSpeaking = false

    const check = () => {
      if (!this.audioContext) return
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      const isSpeaking = avg > this._vadThreshold && !this._isMuted

      if (isSpeaking !== wasSpeaking) {
        wasSpeaking = isSpeaking
        this.onPeerSpeaking?.('local', isSpeaking)
      }

      requestAnimationFrame(check)
    }
    check()
  }

  async getAudioDevices(): Promise<MediaDeviceOption[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 8)})`,
        kind: d.kind as MediaDeviceKind,
      }))
  }

  setPeerVolume(streamId: string, volume: number): void {
    const audio = this.remoteAudioElements.get(streamId)
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume))
    }
  }

  async setInputDevice(deviceId: string): Promise<void> {
    if (!this.localStream || !this.peerConnection) return

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
    })

    const [newTrack] = newStream.getAudioTracks()
    const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender && newTrack) {
      await sender.replaceTrack(newTrack)
      this.localStream.getAudioTracks().forEach((t) => t.stop())
      this.localStream = newStream
    }
  }
}

export const webrtcService = new WebRTCService()
