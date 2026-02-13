<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { VoicePeer } from '@/types'
import { useVoiceStore } from '@/stores/voice'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Card } from '@/components/ui/card'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuLabel, ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { MicOff, HeadphoneOff, UserPlus, Volume2, Monitor } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  peer: VoicePeer
  isLocal?: boolean
}

const props = withDefaults(defineProps<Props>(), { isLocal: false })

const emit = defineEmits<{
  adjustVolume: [userId: string, volume: number]
  addFriend: [userId: string]
  watchStream: [userId: string]
}>()

const voiceStore = useVoiceStore()
const peerVolume = ref(100)
const previewVideo = ref<HTMLVideoElement | null>(null)

const screenStream = computed(() => voiceStore.getScreenStream(props.peer.userId))

watch(screenStream, async (stream) => {
  await nextTick()
  if (previewVideo.value && stream) {
    previewVideo.value.srcObject = stream
  }
})

function onVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement
  peerVolume.value = Number(target.value)
  emit('adjustVolume', props.peer.userId, peerVolume.value / 100)
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as="div">
      <Card
        :class="[
          'flex flex-col items-center gap-2 rounded-xl p-4 transition-all',
          peer.speaking ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : '',
        ]"
      >
        <div class="relative">
          <UserAvatar
            :src="peer.avatar"
            :alt="peer.displayName"
            size="lg"
          />
          <div
            v-if="peer.selfMute"
            class="absolute -bottom-1 -right-1 rounded-full bg-background p-1"
          >
            <MicOff class="h-3.5 w-3.5 text-destructive" />
          </div>
          <div
            v-if="peer.selfDeaf"
            class="absolute -bottom-1 -left-1 rounded-full bg-background p-1"
          >
            <HeadphoneOff class="h-3.5 w-3.5 text-destructive" />
          </div>
        </div>

        <span class="text-sm font-medium text-foreground">{{ peer.displayName }}</span>

        <!-- Streaming badge when no stream received yet -->
        <div v-if="peer.streaming && !screenStream" class="flex items-center gap-1 text-xs text-primary">
          <Monitor class="h-3 w-3" />
          <span>Streaming</span>
        </div>

        <!-- Screen preview + Watch button -->
        <div v-if="peer.streaming && screenStream" class="relative mt-1 w-full overflow-hidden rounded-md">
          <video
            ref="previewVideo"
            autoplay
            muted
            playsinline
            class="w-full rounded-md"
          />
          <Button
            size="sm"
            class="absolute inset-0 m-auto h-7 w-16 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
            @click.stop="emit('watchStream', peer.userId)"
          >
            Watch
          </Button>
        </div>
      </Card>
    </ContextMenuTrigger>

    <ContextMenuContent v-if="!isLocal" class="w-56">
      <ContextMenuLabel>{{ peer.displayName }}</ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem @click="emit('addFriend', peer.userId)" class="gap-2">
        <UserPlus class="h-4 w-4" />
        Add Friend
      </ContextMenuItem>

      <ContextMenuSeparator />

      <div class="px-2 py-1.5">
        <div class="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Volume2 class="h-3.5 w-3.5" />
          <span>Volume: {{ peerVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          :value="peerVolume"
          @input="onVolumeChange"
          class="w-full accent-primary"
        />
      </div>
    </ContextMenuContent>
  </ContextMenu>
</template>
