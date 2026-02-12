import { WS_EVENTS } from '@/constants/events'

type EventHandler = (data: unknown) => void

class WsDispatcher {
  private handlers = new Map<string, EventHandler[]>()

  register(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  unregister(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) handlers.splice(index, 1)
    }
  }

  dispatch(event: string, data: unknown): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const wsDispatcher = new WsDispatcher()
export { WS_EVENTS }
