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

const serverName = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleCreate() {
  if (!serverName.value.trim()) return
  isLoading.value = true
  error.value = ''
  try {
    const server = await serversStore.createServer(serverName.value.trim())
    uiStore.closeModal()
    serverName.value = ''
    router.push(`/channels/${server.id}`)
  } catch {
    error.value = 'Failed to create server'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BaseModal
    title="Create a Server"
    :show="uiStore.activeModal === 'createServer'"
    @close="uiStore.closeModal()"
  >
    <form @submit.prevent="handleCreate" class="space-y-4">
      <p class="text-sm text-text-secondary">
        Your server is where you and your friends hang out. Make yours and start talking.
      </p>

      <div v-if="error" class="rounded bg-danger/10 p-3 text-sm text-danger">
        {{ error }}
      </div>

      <BaseInput
        v-model="serverName"
        label="Server Name"
        placeholder="My Awesome Server"
        required
      />

      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="uiStore.closeModal()">Cancel</BaseButton>
        <BaseButton type="submit" :loading="isLoading">Create</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
