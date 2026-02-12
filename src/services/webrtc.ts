import { wsService } from './websocket'
import type { VoiceSignal, MediaDeviceOption } from '@/types'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
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
    if (!this.peerConnection) return

    switch (signal.type) {
      case 'answer': {
        const desc = new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
        await this.peerConnection.setRemoteDescription(desc)
        break
      }
      case 'ice-candidate': {
        const candidate = new RTCIceCandidate(signal.payload as RTCIceCandidateInit)
        await this.peerConnection.addIceCandidate(candidate)
        break
      }
      case 'offer': {
        // SFU renegotiation
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
        )
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
