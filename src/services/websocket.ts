import { WsOpCode, type WsMessage, type WsHelloPayload } from '@/types/websocket'
import { wsDispatcher } from './wsDispatcher'

type WsListener = (data: unknown, eventName?: string) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private sequence: number | null = null
  private sessionId: string | null = null
  private token: string | null = null
  private listeners = new Map<string, Set<WsListener>>()
  private _isConnected = false
  private _hasConnectedOnce = false
  private _disconnectReason: 'auth_failed' | 'network' | null = null

  private connectionListeners = new Set<(connected: boolean) => void>()
  private authFailureListeners = new Set<() => void>()

  get isConnected(): boolean {
    return this._isConnected
  }

  get disconnectReason(): 'auth_failed' | 'network' | null {
    return this._disconnectReason
  }

  addConnectionListener(fn: (connected: boolean) => void): () => void {
    this.connectionListeners.add(fn)
    return () => this.connectionListeners.delete(fn)
  }

  addAuthFailureListener(fn: () => void): () => void {
    this.authFailureListeners.add(fn)
    return () => this.authFailureListeners.delete(fn)
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((fn) => fn(connected))
  }

  private notifyAuthFailureListeners(): void {
    this.authFailureListeners.forEach((fn) => fn())
  }

  connect(token: string): void {
    this.token = token
    this.reconnectAttempts = 0
    this.doConnect()
  }

  private doConnect(): void {
    if (this.ws) {
      this.ws.close()
    }

    const url = import.meta.env.VITE_WS_URL
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[WS] Connected')
    }

    this.ws.onmessage = (event: MessageEvent) => {
      const message: WsMessage = JSON.parse(event.data)
      this.handleMessage(message)
    }

    this.ws.onclose = (event: CloseEvent) => {
      console.log('[WS] Disconnected:', event.code, event.reason)
      this._isConnected = false
      this.stopHeartbeat()

      if (event.code === 4004) {
        this._disconnectReason = 'auth_failed'
        this.notifyAuthFailureListeners()
      } else if (this._hasConnectedOnce) {
        this._disconnectReason = 'network'
        this.notifyConnectionListeners(false)
      }

      if (this.token && event.code !== 4004) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (error: Event) => {
      console.error('[WS] Error:', error)
    }
  }

  private handleMessage(message: WsMessage): void {
    switch (message.op) {
      case WsOpCode.HELLO: {
        const payload = message.d as WsHelloPayload
        this.startHeartbeat(payload.heartbeatInterval)
        this.identify()
        break
      }

      case WsOpCode.HEARTBEAT_ACK:
        break

      case WsOpCode.DISPATCH: {
        if (message.s != null) this.sequence = message.s
        if (message.t) {
          if (message.t === 'READY') {
            const data = message.d as { sessionId: string }
            this.sessionId = data.sessionId
            this._isConnected = true
            this._hasConnectedOnce = true
            this._disconnectReason = null
            this.reconnectAttempts = 0
            this.notifyConnectionListeners(true)
          }
          wsDispatcher.dispatch(message.t, message.d)
          this.emit(message.t, message.d)
        }
        break
      }

      case WsOpCode.RECONNECT:
        this.ws?.close()
        this.doConnect()
        break
    }
  }

  private identify(): void {
    if (!this.token) return

    if (this.sessionId && this.sequence != null) {
      this.send({
        op: WsOpCode.RESUME,
        d: {
          token: this.token,
          sessionId: this.sessionId,
          seq: this.sequence,
        },
      })
    } else {
      this.send({
        op: WsOpCode.IDENTIFY,
        d: { token: this.token },
      })
    }
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ op: WsOpCode.HEARTBEAT, d: this.sequence })
    }, intervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached')
      return
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.doConnect()
    }, delay)
  }

  send(message: Omit<WsMessage, 's' | 't'>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  sendDispatch(event: string, data: unknown): void {
    this.send({ op: WsOpCode.DISPATCH, d: data, t: event } as WsMessage)
  }

  on(event: string, listener: WsListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  off(event: string, listener: WsListener): void {
    this.listeners.get(event)?.delete(listener)
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(data, event))
  }

  disconnect(): void {
    this.token = null
    this.sessionId = null
    this.sequence = null
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this._isConnected = false
    this.notifyConnectionListeners(false)
  }
}

export const wsService = new WebSocketService()
