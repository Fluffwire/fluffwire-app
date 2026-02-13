<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { serverApi } from '@/services/serverApi'
import { useUiStore } from '@/stores/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const uiStore = useUiStore()
const inviteLink = ref('')
const isLoading = ref(false)
const copied = ref(false)

const isOpen = computed({
  get: () => uiStore.activeModal === 'invite',
  set: (v) => { if (!v) uiStore.closeModal() },
})

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
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t('server.inviteModal') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          {{ $t('server.inviteDesc') }}
        </p>

        <div v-if="isLoading" class="flex justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>

        <div v-else class="flex items-center gap-2">
          <Input :model-value="inviteLink" readonly class="flex-1" />
          <Button size="sm" @click="copyToClipboard" class="shrink-0">
            <Check v-if="copied" class="mr-1.5 h-4 w-4" />
            <Copy v-else class="mr-1.5 h-4 w-4" />
            {{ copied ? $t('server.inviteLinkCopied') : $t('server.copyInvite') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
