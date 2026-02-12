<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import { useUiStore } from '@/stores/ui'
import type { Channel } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const channelsStore = useChannelsStore()
const uiStore = useUiStore()

const channelName = ref('')
const channelTopic = ref('')
const isLoading = ref(false)

const isOpen = computed({
  get: () => uiStore.activeModal === 'editChannel',
  set: (v) => { if (!v) uiStore.closeModal() },
})

const channel = computed(() => uiStore.modalData as Channel | null)

watch(isOpen, (open) => {
  if (open && channel.value) {
    channelName.value = channel.value.name
    channelTopic.value = channel.value.topic ?? ''
  }
})

async function handleSave() {
  if (!channel.value || !channelName.value.trim()) return
  isLoading.value = true
  try {
    await channelsStore.updateChannel(channel.value.id, {
      name: channelName.value.trim().toLowerCase().replace(/\s+/g, '-'),
      topic: channelTopic.value.trim() || undefined,
    })
    toast.success('Channel updated')
    uiStore.closeModal()
  } catch {
    toast.error('Failed to update channel')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Channel</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="space-y-2">
          <Label for="edit-channel-name">Channel Name</Label>
          <Input
            id="edit-channel-name"
            v-model="channelName"
            placeholder="channel-name"
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

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">Cancel</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
