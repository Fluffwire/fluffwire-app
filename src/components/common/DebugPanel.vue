<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { debugLogger, type DebugLog } from '@/utils/debug'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-vue-next'

const logs = ref<DebugLog[]>([])
const isMinimized = ref(false)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  logs.value = debugLogger.getLogs()
  unsubscribe = debugLogger.subscribe((newLogs) => {
    logs.value = newLogs
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

function getLevelColor(level: DebugLog['level']) {
  const colors = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    success: 'text-green-400',
  }
  return colors[level]
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

defineEmits<{
  close: []
}>()

</script>

<template>
  <div class="fixed bottom-4 right-4 z-[9999] w-[600px] max-w-[calc(100vw-2rem)] rounded-lg border-2 border-primary bg-background shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border px-4 py-2">
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
        <span class="font-semibold text-foreground">Debug Panel ({{ logs.length }} logs)</span>
      </div>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          @click="isMinimized = !isMinimized"
        >
          <ChevronDown v-if="!isMinimized" class="h-4 w-4" />
          <ChevronUp v-else class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          @click="debugLogger.downloadLogs()"
        >
          <Download class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          @click="debugLogger.clearLogs()"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          @click="$emit('close')"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Logs -->
    <div v-if="!isMinimized" class="h-[400px]">
      <ScrollArea class="h-full">
        <div class="space-y-1 p-2 font-mono text-xs">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="rounded border border-border/50 bg-card p-2"
          >
            <div class="flex items-start gap-2">
              <span class="text-muted-foreground">{{ formatTime(log.timestamp) }}</span>
              <span :class="['font-bold', getLevelColor(log.level)]">{{ log.level.toUpperCase() }}</span>
              <span class="text-primary font-semibold">[{{ log.category }}]</span>
              <span class="flex-1 text-foreground">{{ log.message }}</span>
            </div>
            <pre v-if="log.data" class="mt-1 overflow-x-auto text-muted-foreground">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
          <div v-if="logs.length === 0" class="p-4 text-center text-muted-foreground">
            No logs yet
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
