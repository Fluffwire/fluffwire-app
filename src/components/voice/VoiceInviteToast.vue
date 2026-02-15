<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useVoiceStore } from '@/stores/voice'
import { useChannelsStore } from '@/stores/channels'
import type { VoiceInvite } from '@/types'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Phone, X } from 'lucide-vue-next'
import { isTauri } from '@/utils/platform'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  invite: VoiceInvite
}>()

const voiceStore = useVoiceStore()
const channelsStore = useChannelsStore()
const router = useRouter()
const { t } = useI18n()

async function accept() {
  voiceStore.dismissInvite(props.invite.inviterId, props.invite.channelId)
  // Fetch channels for the server before navigating
  await channelsStore.fetchChannels(props.invite.serverId)

  try {
    await voiceStore.joinChannel(props.invite.serverId, props.invite.channelId)
    router.push(`/channels/${props.invite.serverId}/${props.invite.channelId}`)
  } catch (error) {
    console.error('[VoiceInviteToast] Failed to join voice channel:', error)

    // Desktop-specific error message (known Tauri webkit bug)
    if (isTauri()) {
      toast.error(t('voice.desktopPermissionError'), {
        description: t('voice.desktopPermissionErrorDesc'),
        duration: 8000,
      })
    } else {
      toast.error(t('voice.joinError'))
    }
  }
}

function dismiss() {
  voiceStore.dismissInvite(props.invite.inviterId, props.invite.channelId)
}
</script>

<template>
  <div class="flex w-80 items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
    <UserAvatar
      :src="invite.inviterAvatar"
      :alt="invite.inviterName"
      size="sm"
    />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-foreground">
        {{ invite.inviterName }}
      </p>
      <p class="truncate text-xs text-muted-foreground">
        Invited you to voice{{ invite.channelName ? ` in #${invite.channelName}` : '' }}
      </p>
    </div>
    <div class="flex gap-1">
      <Button
        size="icon"
        class="h-8 w-8 bg-emerald-600 text-white hover:bg-emerald-700"
        @click="accept"
      >
        <Phone class="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-foreground"
        @click="dismiss"
      >
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
