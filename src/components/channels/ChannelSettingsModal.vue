<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useMembersStore } from '@/stores/members'
import { useLabelsStore } from '@/stores/labels'
import { useUiStore } from '@/stores/ui'
import { channelAccessApi } from '@/services/channelAccessApi'
import { AccessModeLabels, AccessModeDescriptions } from '@/constants/channelAccess'
import type { ChannelAccessMode } from '@/types/message'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const route = useRoute()
const channelsStore = useChannelsStore()
const membersStore = useMembersStore()
const labelsStore = useLabelsStore()
const uiStore = useUiStore()

const serverId = computed(() => route.params.serverId as string)
const channelId = computed(() => uiStore.modalData as string)
const channel = computed(() => channelsStore.channels.find(c => c.id === channelId.value))

const isOpen = computed({
  get: () => uiStore.activeModal === 'channelSettings',
  set: (v) => { if (!v) uiStore.closeModal() },
})

const accessMode = ref<ChannelAccessMode>('open')
const allowedUserIds = ref<string[]>([])
const allowedLabelIds = ref<string[]>([])
const maxParticipants = ref<number | null>(null)
const uploadsEnabled = ref(true)
const isLoading = ref(false)

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
    accessMode.value = channel.value.accessMode || 'open'
    allowedUserIds.value = channel.value.allowedUserIds || []
    allowedLabelIds.value = channel.value.allowedLabelIds || []
    maxParticipants.value = channel.value.maxParticipants || null
    uploadsEnabled.value = channel.value.uploadsEnabled ?? true
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
  if (!channel.value) return
  isLoading.value = true
  try {
    // Update access control
    await channelAccessApi.updateAccessControl(
      channel.value.id,
      accessMode.value,
      allowedUserIds.value,
      allowedLabelIds.value
    )

    // Update max participants for voice channels
    if (channel.value.type === 'voice') {
      await channelAccessApi.setMaxParticipants(channel.value.id, maxParticipants.value)
    }

    // Update uploads enabled
    await channelAccessApi.setUploadsEnabled(channel.value.id, uploadsEnabled.value)

    toast.success(t('channels.settingsUpdated'))
    uiStore.closeModal()
  } catch {
    toast.error(t('channels.failedUpdateSettings'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-2xl max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>
          {{ $t('channels.channelSettings') }}: #{{ channel?.name }}
        </DialogTitle>
      </DialogHeader>

      <div class="flex-1 space-y-4 overflow-y-auto">
        <!-- Access Mode -->
        <div class="space-y-2">
          <Label for="access-mode">{{ $t('channels.accessMode') }}</Label>
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
            <h3 class="mb-2 text-sm font-medium">{{ $t('channels.allowedUsers') }}</h3>
            <p class="mb-3 text-xs text-muted-foreground">
              Owner/Admin/Moderator always have access
            </p>
            <div class="max-h-48 space-y-1 overflow-y-auto">
              <label
                v-for="member in members"
                :key="member.userId"
                class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
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
            <h3 class="mb-2 text-sm font-medium">{{ $t('channels.allowedLabels') }}</h3>
            <div class="max-h-32 space-y-1 overflow-y-auto">
              <label
                v-for="label in labels"
                :key="label.id"
                class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
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
          <Label for="max-participants">{{ $t('channels.maxParticipants') }}</Label>
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
            :checked="uploadsEnabled"
            @update:checked="uploadsEnabled = $event"
          />
          <Label for="uploads-enabled" class="cursor-pointer">
            {{ $t('channels.uploadsEnabled') }}
          </Label>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="ghost" @click="uiStore.closeModal()">
          {{ $t('common.cancel') }}
        </Button>
        <Button @click="handleSave" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          {{ $t('common.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
