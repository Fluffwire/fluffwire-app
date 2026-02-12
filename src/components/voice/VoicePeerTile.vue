<script setup lang="ts">
import type { VoicePeer } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Card } from '@/components/ui/card'
import { MicOff, HeadphoneOff } from 'lucide-vue-next'

interface Props {
  peer: VoicePeer
}

defineProps<Props>()
</script>

<template>
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
</template>
