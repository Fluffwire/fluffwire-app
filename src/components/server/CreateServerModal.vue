<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useUiStore } from '@/stores/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const uiStore = useUiStore()
const router = useRouter()

const serverName = ref('')
const isLoading = ref(false)
const error = ref('')

const isOpen = computed({
  get: () => uiStore.activeModal === 'createServer',
  set: (v) => { if (!v) uiStore.closeModal() },
})

async function handleCreate() {
  if (!serverName.value.trim()) return
  isLoading.value = true
  error.value = ''
  try {
    const server = await serversStore.createServer(serverName.value.trim())
    uiStore.closeModal()
    serverName.value = ''
    await channelsStore.fetchChannels(server.id)
    const firstChannel = channelsStore.textChannels[0]
    router.push(`/channels/${server.id}/${firstChannel?.id ?? ''}`)
  } catch {
    error.value = 'Failed to create server'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <div class="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <DialogHeader>
        <DialogTitle>{{ $t('server.createServer') }}</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Your server is where you and your friends hang out. Make yours and start talking.
        </p>

        <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="space-y-2">
          <Label for="server-name">{{ $t('server.serverName') }}</Label>
          <Input
            id="server-name"
            v-model="serverName"
            :placeholder="$t('server.serverNamePlaceholder')"
            required
          />
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">{{ $t('common.cancel') }}</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ $t('common.create') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
