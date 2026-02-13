<script setup lang="ts">
import { computed } from 'vue'
import { useVoiceStore } from '@/stores/voice'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Monitor, MonitorOff } from 'lucide-vue-next'

const voiceStore = useVoiceStore()

const anyoneStreaming = computed(() => voiceStore.peers.some((p) => p.streaming))
</script>

<template>
  <TooltipProvider>
    <div class="flex items-center gap-1">
      <!-- Mute -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            :class="['h-8 w-8', voiceStore.isMuted ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive' : 'text-muted-foreground']"
            @click="voiceStore.toggleMute()"
          >
            <MicOff v-if="voiceStore.isMuted" class="h-4 w-4" />
            <Mic v-else class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ voiceStore.isMuted ? $t('voice.unmute') : $t('voice.mute') }} ({{ $t('voice.ctrlM') }})</TooltipContent>
      </Tooltip>

      <!-- Deafen -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            :class="['h-8 w-8', voiceStore.isDeafened ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive' : 'text-muted-foreground']"
            @click="voiceStore.toggleDeafen()"
          >
            <HeadphoneOff v-if="voiceStore.isDeafened" class="h-4 w-4" />
            <Headphones v-else class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ voiceStore.isDeafened ? $t('voice.undeafen') : $t('voice.deafen') }} ({{ $t('voice.ctrlD') }})</TooltipContent>
      </Tooltip>

      <!-- Share Screen -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            :class="['h-8 w-8', voiceStore.isScreenSharing ? 'bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary' : 'text-muted-foreground']"
            :disabled="!voiceStore.isScreenSharing && anyoneStreaming"
            @click="voiceStore.isScreenSharing ? voiceStore.stopScreenShare() : voiceStore.startScreenShare()"
          >
            <MonitorOff v-if="voiceStore.isScreenSharing" class="h-4 w-4" />
            <Monitor v-else class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ voiceStore.isScreenSharing ? $t('voice.stopSharing') : anyoneStreaming ? $t('voice.someoneSharing') : $t('voice.shareScreen') }}</TooltipContent>
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
        <TooltipContent>{{ $t('voice.disconnect') }}</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
