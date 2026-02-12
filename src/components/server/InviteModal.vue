<script setup lang="ts">
import { ref, watch } from 'vue'
import { serverApi } from '@/services/serverApi'
import { useUiStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const uiStore = useUiStore()
const inviteLink = ref('')
const isLoading = ref(false)
const copied = ref(false)

watch(() => uiStore.activeModal, async (modal) => {
  if (modal === 'invite' && uiStore.modalData) {
    isLoading.value = true
    try {
      const serverId = uiStore.modalData as string
      const { data } = await serverApi.createInvite(serverId)
      inviteLink.value = `${window.location.origin}/invite/${data.code}`
    } catch {
      inviteLink.value = 'Failed to generate invite'
    } finally {
      isLoading.value = false
    }
  }
})

async function copyToClipboard() {
  await navigator.clipboard.writeText(inviteLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <BaseModal
    title="Invite Friends"
    :show="uiStore.activeModal === 'invite'"
    @close="uiStore.closeModal()"
  >
    <div class="space-y-4">
      <p class="text-sm text-text-secondary">
        Share this invite link with others to grant access to this server.
      </p>

      <div class="flex items-center gap-2 rounded bg-input-bg p-3">
        <input
          :value="inviteLink"
          readonly
          class="flex-1 bg-transparent text-sm text-text-primary outline-none"
        />
        <BaseButton size="sm" @click="copyToClipboard">
          {{ copied ? 'Copied!' : 'Copy' }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
