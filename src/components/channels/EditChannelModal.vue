<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useMembersStore } from '@/stores/members'
import { useLabelsStore } from '@/stores/labels'
import { useUiStore } from '@/stores/ui'
import { AccessModeLabels, AccessModeDescriptions } from '@/constants/channelAccess'
import type { Channel, ChannelAccessMode } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const route = useRoute()
const channelsStore = useChannelsStore()
const membersStore = useMembersStore()
const labelsStore = useLabelsStore()
const uiStore = useUiStore()

const serverId = computed(() => route.params.serverId as string)

const channelName = ref('')
const channelTopic = ref('')
const accessMode = ref<ChannelAccessMode>('open')
const allowedUserIds = ref<string[]>([])
const allowedLabelIds = ref<string[]>([])
const maxParticipants = ref<number | null>(null)
const uploadsEnabled = ref(true)
const isLoading = ref(false)

const isOpen = computed({
  get: () => uiStore.activeModal === 'editChannel',
  set: (v) => { if (!v) uiStore.closeModal() },
})

const channel = computed(() => uiStore.modalData as Channel | null)
const members = computed(() => membersStore.getMembers(serverId.value))
const labels = computed(() => labelsStore.getLabels(serverId.value))

const showWhitelist = computed(() =>
  accessMode.value === 'private' || accessMode.value === 'restricted_write'
)

const maxParticipantsInput = computed({
  get: () => maxParticipants.value ?? undefined,
  set: (val) => {
    maxParticipants.value = val === undefined || val === 0 ? null : val
  }
})

watch(isOpen, (open) => {
  if (open && channel.value) {
    console.log('EditChannelModal - Opening with channel:', channel.value)
    console.log('channel.uploadsEnabled:', channel.value.uploadsEnabled)

    channelName.value = channel.value.name
    channelTopic.value = channel.value.topic ?? ''
    accessMode.value = channel.value.accessMode || 'open'
    allowedUserIds.value = channel.value.allowedUserIds || []
    allowedLabelIds.value = channel.value.allowedLabelIds || []
    maxParticipants.value = channel.value.maxParticipants || null
    uploadsEnabled.value = channel.value.uploadsEnabled ?? true

    console.log('uploadsEnabled.value set to:', uploadsEnabled.value)
  }
})

function isUserAllowed(userId: string): boolean {
  return allowedUserIds.value.includes(userId)
}

function toggleUser(userId: string) {
  const idx = allowedUserIds.value.indexOf(userId)
  if (idx === -1) {
    allowedUserIds.value.push(userId)
  } else {
    allowedUserIds.value.splice(idx, 1)
  }
}

function isLabelAllowed(labelId: string): boolean {
  return allowedLabelIds.value.includes(labelId)
}

function toggleLabel(labelId: string) {
  const idx = allowedLabelIds.value.indexOf(labelId)
  if (idx === -1) {
    allowedLabelIds.value.push(labelId)
  } else {
    allowedLabelIds.value.splice(idx, 1)
  }
}

async function handleSave() {
  if (!channel.value || !channelName.value.trim()) return
  isLoading.value = true
  try {
    const payload = {
      name: channelName.value.trim().toLowerCase().replace(/\s+/g, '-'),
      topic: channelTopic.value.trim() || undefined,
      accessMode: accessMode.value,
      allowedUserIds: allowedUserIds.value,
      allowedLabelIds: allowedLabelIds.value,
      maxParticipants: channel.value.type === 'voice' ? maxParticipants.value : undefined,
      uploadsEnabled: channel.value.type === 'text' ? uploadsEnabled.value : undefined,
    }
    console.log('EditChannelModal - Saving channel with payload:', payload)
    console.log('uploadsEnabled.value:', uploadsEnabled.value)

    // Single PATCH call with all fields
    await channelsStore.updateChannel(channel.value.id, payload)

    toast.success(t('channel.channelUpdated'))
    uiStore.closeModal()
  } catch {
    toast.error(t('channel.failedUpdateChannel'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-2xl max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ $t('channel.editChannel') }}</DialogTitle>
      </DialogHeader>

      <form class="flex-1 space-y-4 overflow-y-auto" @submit.prevent="handleSave">
        <!-- Basic Info -->
        <div class="space-y-2">
          <Label for="edit-channel-name">{{ $t('channel.channelName') }}</Label>
          <Input
            id="edit-channel-name"
            v-model="channelName"
            :placeholder="$t('channel.channelNamePlaceholder')"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="edit-channel-topic">Topic</Label>
          <Input
            id="edit-channel-topic"
            v-model="channelTopic"
            placeholder="What's this channel about?"
          />
        </div>

        <Separator />

        <!-- Access Control -->
        <div class="space-y-2">
          <Label for="access-mode">{{ $t('channel.accessMode') }}</Label>
          <select
            id="access-mode"
            v-model="accessMode"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option
              v-for="(label, mode) in AccessModeLabels"
              :key="mode"
              :value="mode"
            >
              {{ label }}
            </option>
          </select>
          <p class="text-xs text-muted-foreground">
            {{ AccessModeDescriptions[accessMode] }}
          </p>
        </div>

        <!-- Whitelists (for private/restricted_write) -->
        <div v-if="showWhitelist" class="space-y-4 rounded-lg border border-border p-4">
          <div>
            <h3 class="mb-2 text-sm font-medium">{{ $t('channel.allowedUsers') }}</h3>
            <p class="mb-3 text-xs text-muted-foreground">
              Owner/Admin/Moderator always have access
            </p>
            <div class="max-h-48 space-y-1 overflow-y-auto">
              <label
                v-for="member in members"
                :key="member.userId"
                class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  :checked="isUserAllowed(member.userId)"
                  @update:checked="toggleUser(member.userId)"
                />
                <span class="text-sm">
                  {{ member.nickname || member.user?.displayName || 'Unknown' }}
                </span>
              </label>
            </div>
          </div>

          <div>
            <h3 class="mb-2 text-sm font-medium">{{ $t('channel.allowedLabels') }}</h3>
            <div class="max-h-32 space-y-1 overflow-y-auto">
              <label
                v-for="label in labels"
                :key="label.id"
                class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  :checked="isLabelAllowed(label.id)"
                  @update:checked="toggleLabel(label.id)"
                />
                <div class="flex items-center gap-2">
                  <div
                    class="h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: label.color || '#99aab5' }"
                  />
                  <span class="text-sm">{{ label.name }}</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Max Participants (voice only) -->
        <div v-if="channel?.type === 'voice'" class="space-y-2">
          <Label for="max-participants">{{ $t('channel.maxParticipants') }}</Label>
          <Input
            id="max-participants"
            v-model.number="maxParticipantsInput"
            type="number"
            min="0"
            placeholder="Unlimited"
          />
          <p class="text-xs text-muted-foreground">
            Leave empty or 0 for unlimited. Owner/Admin/Moderator can bypass limits.
          </p>
        </div>

        <!-- Uploads Enabled -->
        <div v-if="channel?.type === 'text'" class="flex items-center gap-2">
          <Checkbox
            id="uploads-enabled"
            v-model="uploadsEnabled"
          />
          <Label for="uploads-enabled" class="cursor-pointer">
            {{ $t('channel.uploadsEnabled') }}
          </Label>
        </div>

        <DialogFooter class="gap-2 pt-4">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">{{ $t('common.cancel') }}</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ $t('settings.saveChanges') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
