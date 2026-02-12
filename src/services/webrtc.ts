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
  private audioContext: AudioContext | null = null
  private analyserNodes = new Map<string, AnalyserNode>()

  private _isMuted = false
  private _isDeafened = false
  private _currentChannelId: string | null = null
  private _currentServerId: string | null = null

  // ICE candidate buffer — queued until remote description is set
  private iceCandidateBuffer: RTCIceCandidateInit[] = []
  private hasRemoteDescription = false

  // Serialise all signal handling to prevent races
  private signalQueue: Promise<void> = Promise.resolve()

  onPeerSpeaking: ((userId: string, speaking: boolean) => void) | null = null
  onRemoteStream: ((userId: string, stream: MediaStream) => void) | null = null
  onPeerDisconnected: ((userId: string) => void) | null = null

  get isMuted(): boolean { return this._isMuted }
  get isDeafened(): boolean { return this._isDeafened }
  get currentChannelId(): string | null { return this._currentChannelId }

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

      this.localStream.getAudioTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      this.peerConnection.ontrack = (event: RTCTrackEvent) => {
        const [stream] = event.streams
        if (stream) {
          const peerId = stream.id
          this.remoteStreams.set(peerId, stream)
          this.onRemoteStream?.(peerId, stream)
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
    } catch (error) {
      console.error('[WebRTC] Failed to join voice channel:', error)
      await this.leaveVoiceChannel()
      throw error
    }
  }

  async handleSignal(signal: VoiceSignal): Promise<void> {
    // Serialise signal handling to prevent race conditions
    this.signalQueue = this.signalQueue.then(() => this.processSignal(signal)).catch((err) => {
      console.error('[WebRTC] Signal processing error:', err)
    })
  }

  private async processSignal(signal: VoiceSignal): Promise<void> {
    if (!this.peerConnection) return

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
        // SFU renegotiation — server is adding new tracks
        const state = this.peerConnection.signalingState
        if (state !== 'stable') {
          console.warn(`[WebRTC] Received renegotiation offer in state ${state}, rolling back`)
          // Rollback our pending local offer so we can accept the server's
          await this.peerConnection.setLocalDescription({ type: 'rollback' })
        }
        // Clear stale buffered candidates since new SDP means new ICE credentials
        this.iceCandidateBuffer = []
        this.hasRemoteDescription = false

        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
        )
        this.hasRemoteDescription = true

        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)
        await this.drainIceCandidateBuffer()

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
    for (const candidate of buffered) {
      try {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[WebRTC] Failed to add buffered ICE candidate:', err)
      }
    }
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !this._isMuted
    })
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
    this.remoteStreams.forEach((stream) => {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !this._isDeafened
      })
    })
    this.sendVoiceStateUpdate()
    return this._isDeafened
  }

  private sendVoiceStateUpdate(): void {
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

  async leaveVoiceChannel(): Promise<void> {
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
    this.analyserNodes.clear()
    this.audioContext?.close()
    this.audioContext = null

    this._currentChannelId = null
    this._currentServerId = null
    this._isMuted = false
    this._isDeafened = false
    this.hasRemoteDescription = false
    this.iceCandidateBuffer = []
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
      const isSpeaking = avg > 15 && !this._isMuted

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
