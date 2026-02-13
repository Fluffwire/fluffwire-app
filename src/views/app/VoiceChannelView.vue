<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import { useAuthStore } from '@/stores/auth'
import { useFriendsStore } from '@/stores/friends'
import { useMembersStore } from '@/stores/members'
import { useUiStore } from '@/stores/ui'
import { webrtcService } from '@/services/webrtc'
import { wsService } from '@/services/websocket'
import VoicePeerTile from '@/components/voice/VoicePeerTile.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Headphones, X, UserPlus, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const route = useRoute()
const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()
const authStore = useAuthStore()
const friendsStore = useFriendsStore()
const membersStore = useMembersStore()
const uiStore = useUiStore()

const channelId = computed(() => route.params.channelId as string)
const serverId = computed(() => route.params.serverId as string)
const channel = computed(() =>
  channelsStore.channels.find((c) => c.id === channelId.value)
)

const fullScreenVideo = ref<HTMLVideoElement | null>(null)
const showInvitePicker = ref(false)

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

// Members not currently in this voice channel
const invitableMembers = computed(() => {
  const members = membersStore.getMembers(serverId.value)
  const inVoice = new Set(voiceStore.peers.map((p) => p.userId))
  return members.filter(
    (m) => m.userId !== authStore.user?.id && !inVoice.has(m.userId)
  )
})

watch(watchingStream, async (stream) => {
  await nextTick()
  if (fullScreenVideo.value) {
    fullScreenVideo.value.srcObject = stream ?? null
  }
}, { immediate: true })

function sendVoiceInvite(targetUserId: string) {
  wsService.sendDispatch('VOICE_INVITE', {
    targetUserId,
    channelId: channelId.value,
    serverId: serverId.value,
  })
  showInvitePicker.value = false
  toast.success('Voice invite sent')
}

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
    <div class="flex h-12 items-center justify-between border-b border-primary/20 px-4">
      <div class="flex items-center gap-2">
        <Headphones class="h-5 w-5 text-primary/70" />
        <h3 class="font-semibold text-foreground">{{ channel?.name ?? 'Voice Channel' }}</h3>
        <span class="text-xs text-muted-foreground">{{ voiceStore.peers.length }} connected</span>
      </div>
      <div class="flex items-center gap-1">
        <TooltipProvider>
          <Popover v-model:open="showInvitePicker">
            <Tooltip>
              <TooltipTrigger as-child>
                <PopoverTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <UserPlus class="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Invite to Voice</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" class="w-64 p-2">
              <p class="mb-2 px-2 text-xs font-semibold text-muted-foreground">Invite to Voice</p>
              <div v-if="invitableMembers.length === 0" class="px-2 py-3 text-center text-sm text-muted-foreground">
                No members to invite
              </div>
              <div v-else class="max-h-48 overflow-y-auto">
                <button
                  v-for="member in invitableMembers"
                  :key="member.userId"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  @click="sendVoiceInvite(member.userId)"
                >
                  <UserAvatar
                    :src="member.user.avatar"
                    :alt="member.user.displayName"
                    size="xs"
                  />
                  <span class="truncate text-foreground">{{ member.user.displayName }}</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                :class="uiStore.showMemberSidebar ? 'bg-accent text-foreground' : 'text-muted-foreground'"
                @click="uiStore.toggleMemberSidebar()"
              >
                <Users class="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Member List</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
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
