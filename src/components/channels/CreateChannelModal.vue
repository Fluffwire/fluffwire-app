<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useUiStore } from '@/stores/ui'
import type { ChannelType } from '@/types'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const route = useRoute()
const channelsStore = useChannelsStore()
const uiStore = useUiStore()

const channelName = ref('')
const channelType = ref<ChannelType>('text')
const isLoading = ref(false)

async function handleCreate() {
  if (!channelName.value.trim()) return
  isLoading.value = true
  try {
    await channelsStore.createChannel(route.params.serverId as string, {
      name: channelName.value.trim().toLowerCase().replace(/\s+/g, '-'),
      type: channelType.value,
    })
    uiStore.closeModal()
    channelName.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BaseModal
    title="Create Channel"
    :show="uiStore.activeModal === 'createChannel'"
    @close="uiStore.closeModal()"
  >
    <form @submit.prevent="handleCreate" class="space-y-4">
      <div>
        <label class="mb-2 block text-xs font-bold uppercase text-text-secondary">Channel Type</label>
        <div class="space-y-2">
          <label
            :class="[
              'flex cursor-pointer items-center gap-3 rounded p-3 transition-colors',
              channelType === 'text' ? 'bg-active-bg' : 'hover:bg-hover-bg',
            ]"
          >
            <input v-model="channelType" type="radio" value="text" class="hidden" />
            <svg class="h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.88 21l1.54-6H2.5l.5-2h4.92l1.04-4H4.04l.5-2h4.92L11 1h2l-1.54 6h4.08L17 1h2l-1.54 6H22.5l-.5 2h-4.92l-1.04 4h4.92l-.5 2h-4.92L14 21h-2l1.54-6h-4.08L8 21H5.88z" />
            </svg>
            <div>
              <div class="text-sm font-medium text-text-primary">Text</div>
              <div class="text-xs text-text-secondary">Send messages and media</div>
            </div>
          </label>

          <label
            :class="[
              'flex cursor-pointer items-center gap-3 rounded p-3 transition-colors',
              channelType === 'voice' ? 'bg-active-bg' : 'hover:bg-hover-bg',
            ]"
          >
            <input v-model="channelType" type="radio" value="voice" class="hidden" />
            <svg class="h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3a9 9 0 00-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 00-9-9z" />
            </svg>
            <div>
              <div class="text-sm font-medium text-text-primary">Voice</div>
              <div class="text-xs text-text-secondary">Voice chat with others</div>
            </div>
          </label>
        </div>
      </div>

      <BaseInput
        v-model="channelName"
        label="Channel Name"
        placeholder="new-channel"
        required
      />

      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="uiStore.closeModal()">Cancel</BaseButton>
        <BaseButton type="submit" :loading="isLoading">Create Channel</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
