<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

interface Props {
  channelName: string
  isDm?: boolean
}

defineProps<Props>()
const uiStore = useUiStore()
</script>

<template>
  <div class="flex h-12 items-center justify-between border-b border-border/50 px-4 shadow-sm">
    <div class="flex items-center gap-2">
      <svg v-if="!isDm" class="h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5.88 21l1.54-6H2.5l.5-2h4.92l1.04-4H4.04l.5-2h4.92L11 1h2l-1.54 6h4.08L17 1h2l-1.54 6H22.5l-.5 2h-4.92l-1.04 4h4.92l-.5 2h-4.92L14 21h-2l1.54-6h-4.08L8 21H5.88z" />
      </svg>
      <svg v-else class="h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
      </svg>
      <h3 class="font-semibold text-text-primary">{{ channelName }}</h3>
    </div>

    <div class="flex items-center gap-2">
      <!-- Toggle member sidebar -->
      <button
        v-if="!isDm"
        @click="uiStore.toggleMemberSidebar()"
        :class="[
          'rounded p-1.5 transition-colors',
          uiStore.showMemberSidebar
            ? 'text-text-primary'
            : 'text-text-secondary hover:text-text-primary',
        ]"
        title="Toggle Member List"
      >
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      </button>
    </div>
  </div>
</template>
