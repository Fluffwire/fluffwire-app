<script setup lang="ts">
import { computed } from 'vue'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import VoiceControls from './VoiceControls.vue'
import { Badge } from '@/components/ui/badge'

const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()

const channelName = computed(() => {
  const ch = channelsStore.channels.find((c) => c.id === voiceStore.currentChannelId)
  return ch?.name ?? 'Voice Channel'
})
</script>

<template>
  <div class="border-t border-border/50 bg-card/80 px-3 py-2">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 animate-pulse rounded-full bg-online shadow-sm shadow-online/50" />
          <span class="text-xs font-medium text-online">Voice Connected</span>
        </div>
        <div class="truncate text-xs text-muted-foreground">{{ channelName }}</div>
      </div>
      <VoiceControls />
    </div>

    <!-- Connected peers -->
    <div v-if="voiceStore.peers.length > 0" class="mt-1.5 flex flex-wrap gap-1">
      <Badge
        v-for="peer in voiceStore.peers"
        :key="peer.userId"
        :variant="peer.speaking ? 'default' : 'secondary'"
        :class="['text-xs', peer.speaking ? 'bg-primary/20 text-primary' : '']"
      >
        {{ peer.displayName }}
      </Badge>
    </div>
  </div>
</template>
