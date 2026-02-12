<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useVoiceStore } from '@/stores/voice'
import { useRouter } from 'vue-router'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

const authStore = useAuthStore()
const voiceStore = useVoiceStore()
const router = useRouter()
</script>

<template>
  <div class="flex items-center gap-2 bg-server-bg/50 px-2 py-1.5">
    <BaseAvatar
      :src="authStore.user?.avatar ?? null"
      :alt="authStore.user?.displayName ?? ''"
      size="sm"
      :status="authStore.user?.status"
    />

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium text-text-primary">
        {{ authStore.user?.displayName }}
      </div>
      <div class="truncate text-xs text-text-secondary">
        {{ authStore.user?.status ?? 'Online' }}
      </div>
    </div>

    <div class="flex gap-1">
      <!-- Mute button -->
      <button
        @click="voiceStore.toggleMute()"
        :class="[
          'rounded p-1.5 transition-colors',
          voiceStore.isMuted
            ? 'text-danger hover:bg-danger/20'
            : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
        ]"
        title="Toggle Mute"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path v-if="!voiceStore.isMuted" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          <path v-else d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
        </svg>
      </button>

      <!-- Deafen button -->
      <button
        @click="voiceStore.toggleDeafen()"
        :class="[
          'rounded p-1.5 transition-colors',
          voiceStore.isDeafened
            ? 'text-danger hover:bg-danger/20'
            : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
        ]"
        title="Toggle Deafen"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path v-if="!voiceStore.isDeafened" d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
          <path v-else d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87v-1c0-.55-.45-1-1-1s-1 .45-1 1v1zm-7-8c-1.86 0-3.47 1.01-4.33 2.51l6.89 6.89c.27-.24.44-.58.44-.97V6c0-1.1-.9-2-2-2z" />
        </svg>
      </button>

      <!-- Settings button -->
      <button
        @click="router.push('/settings')"
        class="rounded p-1.5 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary"
        title="Settings"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>
    </div>
  </div>
</template>
