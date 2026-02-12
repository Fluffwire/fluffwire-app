<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import VoicePeerTile from '@/components/voice/VoicePeerTile.vue'

const route = useRoute()
const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()

const channelId = computed(() => route.params.channelId as string)
const channel = computed(() =>
  channelsStore.channels.find((c) => c.id === channelId.value)
)
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex h-12 items-center border-b border-border/50 px-4 shadow-sm">
      <svg class="mr-2 h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3a9 9 0 00-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 00-9-9z" />
      </svg>
      <h3 class="font-semibold text-text-primary">{{ channel?.name ?? 'Voice Channel' }}</h3>
    </div>

    <div class="flex flex-1 flex-wrap items-center justify-center gap-4 p-8">
      <VoicePeerTile
        v-for="peer in voiceStore.peers"
        :key="peer.userId"
        :peer="peer"
      />

      <div v-if="voiceStore.peers.length === 0" class="text-center text-text-secondary">
        <svg class="mx-auto mb-4 h-16 w-16 opacity-50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 00-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 00-9-9z" />
        </svg>
        <p>No one is in this voice channel yet</p>
      </div>
    </div>
  </div>
</template>
