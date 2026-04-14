<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Monitor, MonitorOff, Eye, EyeOff, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()

const anyoneStreaming = computed(() => voiceStore.peers.some((p) => p.streaming))

async function handleDisconnect() {
  const serverId = voiceStore.currentServerId
  await voiceStore.leaveChannel()

  // Navigate to first text channel in the server
  if (serverId) {
    const textChannel = channelsStore.channels.find(
      (c) => c.serverId === serverId && c.type === 'text'
    )
    if (textChannel) {
      router.push(`/channels/${serverId}/${textChannel.id}`)
    }
  }
}
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

      <!-- Share Screen - Simple button when not streaming, dropdown when streaming -->
      <Tooltip v-if="!voiceStore.isScreenSharing">
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground"
            :disabled="anyoneStreaming"
            @click="voiceStore.startScreenShare()"
          >
            <Monitor class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ anyoneStreaming ? $t('voice.someoneSharing') : $t('voice.shareScreen') }}</TooltipContent>
      </Tooltip>

      <!-- Screen Share Menu (when streaming) -->
      <DropdownMenu v-else>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary"
          >
            <Monitor class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="voiceStore.stopScreenShare()">
            <MonitorOff class="h-4 w-4 mr-2" />
            {{ $t('voice.stopSharing') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="voiceStore.changeScreenSource()">
            <RefreshCw class="h-4 w-4 mr-2" />
            {{ $t('voice.changeSource') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="voiceStore.toggleSelfView()">
            <component :is="voiceStore.showSelfStream ? EyeOff : Eye" class="h-4 w-4 mr-2" />
            {{ voiceStore.showSelfStream ? $t('voice.hideSelfView') : $t('voice.showSelfView') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Disconnect -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            @click="handleDisconnect()"
          >
            <PhoneOff class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t('voice.disconnect') }}</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
