<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useUiStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const serversStore = useServersStore()
const uiStore = useUiStore()
const router = useRouter()

const inviteCode = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleJoin() {
  if (!inviteCode.value.trim()) return
  isLoading.value = true
  error.value = ''
  try {
    const server = await serversStore.joinServer(inviteCode.value.trim())
    uiStore.closeModal()
    inviteCode.value = ''
    router.push(`/channels/${server.id}`)
  } catch {
    error.value = 'Invalid or expired invite code'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BaseModal
    title="Join a Server"
    :show="uiStore.activeModal === 'joinServer'"
    @close="uiStore.closeModal()"
  >
    <form @submit.prevent="handleJoin" class="space-y-4">
      <p class="text-sm text-text-secondary">
        Enter an invite code to join an existing server.
      </p>

      <div v-if="error" class="rounded bg-danger/10 p-3 text-sm text-danger">
        {{ error }}
      </div>

      <BaseInput
        v-model="inviteCode"
        label="Invite Code"
        placeholder="Enter an invite code"
        required
      />

      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="uiStore.closeModal()">Cancel</BaseButton>
        <BaseButton type="submit" :loading="isLoading">Join Server</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
