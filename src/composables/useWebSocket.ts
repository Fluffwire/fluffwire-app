import { ref, onUnmounted } from 'vue'
import { wsService } from '@/services/websocket'

export function useWebSocket() {
  const isConnected = ref(wsService.isConnected)

  function on(event: string, handler: (data: unknown) => void) {
    wsService.on(event, handler)
    onUnmounted(() => wsService.off(event, handler))
  }

  function send(event: string, data: unknown) {
    wsService.sendDispatch(event, data)
  }

  return {
    isConnected,
    on,
    send,
  }
}
