<script setup lang="ts">
import { useVoiceStore } from '@/stores/voice'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff } from 'lucide-vue-next'

const voiceStore = useVoiceStore()
</script>

<template>
  <TooltipProvider>
    <div class="flex items-center gap-1">
      <!-- Mute -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Toggle
            :pressed="voiceStore.isMuted"
            @update:pressed="voiceStore.toggleMute()"
            size="sm"
            :class="['h-8 w-8 p-0', voiceStore.isMuted ? 'bg-destructive/20 text-destructive' : '']"
          >
            <MicOff v-if="voiceStore.isMuted" class="h-4 w-4" />
            <Mic v-else class="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{{ voiceStore.isMuted ? 'Unmute' : 'Mute' }}</TooltipContent>
      </Tooltip>

      <!-- Deafen -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Toggle
            :pressed="voiceStore.isDeafened"
            @update:pressed="voiceStore.toggleDeafen()"
            size="sm"
            :class="['h-8 w-8 p-0', voiceStore.isDeafened ? 'bg-destructive/20 text-destructive' : '']"
          >
            <HeadphoneOff v-if="voiceStore.isDeafened" class="h-4 w-4" />
            <Headphones v-else class="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{{ voiceStore.isDeafened ? 'Undeafen' : 'Deafen' }}</TooltipContent>
      </Tooltip>

      <!-- Disconnect -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            @click="voiceStore.leaveChannel()"
          >
            <PhoneOff class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Disconnect</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
