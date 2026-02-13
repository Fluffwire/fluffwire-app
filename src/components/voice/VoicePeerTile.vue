<script setup lang="ts">
import { ref } from 'vue'
import type { VoicePeer } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Card } from '@/components/ui/card'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuLabel, ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { MicOff, HeadphoneOff, UserPlus, Volume2 } from 'lucide-vue-next'

interface Props {
  peer: VoicePeer
  isLocal?: boolean
}

const props = withDefaults(defineProps<Props>(), { isLocal: false })

const emit = defineEmits<{
  adjustVolume: [userId: string, volume: number]
  addFriend: [userId: string]
}>()

const peerVolume = ref(100)

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
