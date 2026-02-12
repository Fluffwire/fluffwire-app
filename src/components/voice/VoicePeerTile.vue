<script setup lang="ts">
import type { VoicePeer } from '@/types'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

interface Props {
  peer: VoicePeer
}

defineProps<Props>()
</script>

<template>
  <div
    :class="[
      'flex flex-col items-center gap-2 rounded-xl p-4 transition-all',
      peer.speaking ? 'ring-2 ring-online bg-online/10' : 'bg-channel-bg',
    ]"
  >
    <div class="relative">
      <BaseAvatar
        :src="peer.avatar"
        :alt="peer.displayName"
        size="lg"
      />
      <div
        v-if="peer.selfMute"
        class="absolute -bottom-1 -right-1 rounded-full bg-chat-bg p-1"
      >
        <svg class="h-3.5 w-3.5 text-danger" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
        </svg>
      </div>
      <div
        v-if="peer.selfDeaf"
        class="absolute -bottom-1 -left-1 rounded-full bg-chat-bg p-1"
      >
        <svg class="h-3.5 w-3.5 text-danger" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0z" />
        </svg>
      </div>
    </div>

    <span class="text-sm font-medium text-text-primary">{{ peer.displayName }}</span>
  </div>
</template>
