<script setup lang="ts">
import { computed } from 'vue'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import VoiceControls from './VoiceControls.vue'

const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()

const channelName = computed(() => {
  const ch = channelsStore.channels.find((c) => c.id === voiceStore.currentChannelId)
  return ch?.name ?? 'Voice Channel'
})
</script>

<template>
  <div class="absolute bottom-0 left-0 right-0 border-t border-border bg-channel-bg p-3">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-online" />
          <span class="text-sm font-medium text-online">Voice Connected</span>
        </div>
        <div class="truncate text-xs text-text-secondary">{{ channelName }}</div>
      </div>
      <VoiceControls />
    </div>

    <!-- Connected peers -->
    <div v-if="voiceStore.peers.length > 0" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="peer in voiceStore.peers"
        :key="peer.userId"
        :class="[
          'rounded-full px-2 py-0.5 text-xs',
          peer.speaking ? 'bg-online/20 text-online' : 'bg-hover-bg text-text-secondary',
        ]"
      >
        {{ peer.displayName }}
      </span>
    </div>
  </div>
</template>
