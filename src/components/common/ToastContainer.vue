<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

const typeClasses = {
  success: 'border-l-4 border-success bg-success/10',
  error: 'border-l-4 border-danger bg-danger/10',
  info: 'border-l-4 border-blurple bg-blurple/10',
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in uiStore.toasts"
        :key="toast.id"
        :class="[
          'flex items-center gap-3 rounded px-4 py-3 text-sm text-text-primary shadow-lg',
          typeClasses[toast.type],
        ]"
      >
        <span class="flex-1">{{ toast.message }}</span>
        <button
          @click="uiStore.removeToast(toast.id)"
          class="text-text-secondary hover:text-text-primary"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to { opacity: 0; transform: translateX(100%); }
</style>
