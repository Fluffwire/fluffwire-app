<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DebugPanel from '@/components/common/DebugPanel.vue'
import { isTauri } from '@/utils/debug'

const showDebugPanel = ref(false)

onMounted(() => {
  // Auto-show debug panel in Tauri or when Ctrl+Shift+D is pressed
  if (isTauri) {
    showDebugPanel.value = true
  }

  // Toggle debug panel with Ctrl+Shift+D
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      showDebugPanel.value = !showDebugPanel.value
    }
  })
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
    <div class="w-full max-w-md p-4 sm:p-8">
      <slot />
    </div>

    <!-- Debug panel (auto-shown in Tauri) -->
    <DebugPanel v-if="showDebugPanel" @close="showDebugPanel = false" />
  </div>
</template>
