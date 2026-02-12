<script setup lang="ts">
import { useVoiceStore } from '@/stores/voice'

const voiceStore = useVoiceStore()
</script>

<template>
  <div class="flex items-center gap-1">
    <!-- Mute -->
    <button
      @click="voiceStore.toggleMute()"
      :class="[
        'rounded p-2 transition-colors',
        voiceStore.isMuted
          ? 'bg-danger/20 text-danger hover:bg-danger/30'
          : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
      ]"
      :title="voiceStore.isMuted ? 'Unmute' : 'Mute'"
    >
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path v-if="!voiceStore.isMuted" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        <path v-else d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
      </svg>
    </button>

    <!-- Deafen -->
    <button
      @click="voiceStore.toggleDeafen()"
      :class="[
        'rounded p-2 transition-colors',
        voiceStore.isDeafened
          ? 'bg-danger/20 text-danger hover:bg-danger/30'
          : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
      ]"
      :title="voiceStore.isDeafened ? 'Undeafen' : 'Deafen'"
    >
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path v-if="!voiceStore.isDeafened" d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
        <path v-else d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87v-1c0-.55-.45-1-1-1s-1 .45-1 1v1z" />
      </svg>
    </button>

    <!-- Disconnect -->
    <button
      @click="voiceStore.leaveChannel()"
      class="rounded p-2 text-text-secondary transition-colors hover:bg-danger/20 hover:text-danger"
      title="Disconnect"
    >
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 00-2.67-1.85.996.996 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
      </svg>
    </button>
  </div>
</template>
