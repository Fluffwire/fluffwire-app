<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import { useAuthStore } from '@/stores/auth'
import { useFriendsStore } from '@/stores/friends'
import { webrtcService } from '@/services/webrtc'
import VoicePeerTile from '@/components/voice/VoicePeerTile.vue'
import { Button } from '@/components/ui/button'
import { Headphones, X } from 'lucide-vue-next'

const route = useRoute()
const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()
const authStore = useAuthStore()
const friendsStore = useFriendsStore()

const channelId = computed(() => route.params.channelId as string)
const channel = computed(() =>
  channelsStore.channels.find((c) => c.id === channelId.value)
)

const fullScreenVideo = ref<HTMLVideoElement | null>(null)

const watchingPeer = computed(() =>
  voiceStore.watchingUserId
    ? voiceStore.peers.find((p) => p.userId === voiceStore.watchingUserId)
    : null
)

const watchingStream = computed(() =>
  voiceStore.watchingUserId
    ? voiceStore.getScreenStream(voiceStore.watchingUserId)
    : undefined
)

watch(watchingStream, async (stream) => {
  await nextTick()
  if (fullScreenVideo.value && stream) {
    fullScreenVideo.value.srcObject = stream
  }
})

function handleWatchStream(userId: string) {
  voiceStore.watchStream(userId)
}

function handleAdjustVolume(_userId: string, volume: number) {
  webrtcService.setPeerVolume(_userId, volume)
}

function handleAddFriend(userId: string) {
  const peer = voiceStore.peers.find((p) => p.userId === userId)
  if (peer?.username) {
    friendsStore.sendRequest(peer.username)
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex h-12 items-center border-b border-primary/20 px-4">
      <Headphones class="mr-2 h-5 w-5 text-primary/70" />
      <h3 class="font-semibold text-foreground">{{ channel?.name ?? 'Voice Channel' }}</h3>
    </div>

    <!-- Full-size screen share viewer -->
    <div v-if="watchingPeer && watchingStream" class="relative flex flex-1 flex-col">
      <div class="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <span class="text-sm font-medium text-foreground">{{ watchingPeer.displayName }}'s screen</span>
        <Button
          variant="ghost"
          size="icon"
          class="ml-auto h-7 w-7 text-muted-foreground"
          @click="voiceStore.stopWatching()"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
      <div class="flex flex-1 items-center justify-center bg-black">
        <video
          ref="fullScreenVideo"
          autoplay
          playsinline
          class="max-h-full max-w-full object-contain"
        />
      </div>
      <!-- Peer tiles row at bottom when watching -->
      <div class="flex items-center justify-center gap-3 border-t border-border/50 p-3">
        <VoicePeerTile
          v-for="peer in voiceStore.peers"
          :key="peer.userId"
          :peer="peer"
          :is-local="peer.userId === authStore.user?.id"
          @adjust-volume="handleAdjustVolume"
          @add-friend="handleAddFriend"
          @watch-stream="handleWatchStream"
        />
      </div>
    </div>

    <!-- Normal peer tile grid -->
    <div v-else class="flex flex-1 flex-wrap items-center justify-center gap-4 p-8">
      <VoicePeerTile
        v-for="peer in voiceStore.peers"
        :key="peer.userId"
        :peer="peer"
        :is-local="peer.userId === authStore.user?.id"
        @adjust-volume="handleAdjustVolume"
        @add-friend="handleAddFriend"
        @watch-stream="handleWatchStream"
      />

      <div v-if="voiceStore.peers.length === 0" class="text-center text-muted-foreground">
        <Headphones class="mx-auto mb-4 h-16 w-16 opacity-50" />
        <p>No one is in this voice channel yet</p>
      </div>
    </div>
  </div>
</template>
