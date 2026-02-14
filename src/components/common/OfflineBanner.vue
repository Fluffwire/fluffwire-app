<script setup lang="ts">
import { wsService } from '@/services/websocket'
import { Button } from '@/components/ui/button'
import { WifiOff, X } from 'lucide-vue-next'

const emit = defineEmits<{
  dismiss: []
}>()

function retry() {
  wsService.reconnect()
}
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="-translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="-translate-y-full"
  >
    <div class="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
      <WifiOff class="h-4 w-4 shrink-0" />
      <span class="font-medium">Connection lost</span>
      <Button
        variant="outline"
        size="sm"
        class="h-7 border-destructive-foreground/30 bg-transparent text-destructive-foreground hover:bg-destructive-foreground/10"
        @click="retry"
      >
        Retry
      </Button>
      <button
        class="ml-1 rounded p-0.5 hover:bg-destructive-foreground/10"
        @click="emit('dismiss')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>
