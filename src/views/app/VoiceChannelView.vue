<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import VoicePeerTile from '@/components/voice/VoicePeerTile.vue'
import { Headphones } from 'lucide-vue-next'

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
    <div class="flex h-12 items-center border-b border-primary/20 px-4">
      <Headphones class="mr-2 h-5 w-5 text-primary/70" />
      <h3 class="font-semibold text-foreground">{{ channel?.name ?? 'Voice Channel' }}</h3>
    </div>

    <div class="flex flex-1 flex-wrap items-center justify-center gap-4 p-8">
      <VoicePeerTile
        v-for="peer in voiceStore.peers"
        :key="peer.userId"
        :peer="peer"
      />

      <div v-if="voiceStore.peers.length === 0" class="text-center text-muted-foreground">
        <Headphones class="mx-auto mb-4 h-16 w-16 opacity-50" />
        <p>No one is in this voice channel yet</p>
      </div>
    </div>
  </div>
</template>
