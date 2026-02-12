<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useServersStore } from '@/stores/servers'
import { useUiStore } from '@/stores/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const serversStore = useServersStore()
const uiStore = useUiStore()

const serverName = ref('')
const isLoading = ref(false)
const error = ref('')

const isOpen = computed({
  get: () => uiStore.activeModal === 'serverSettings',
  set: (v) => { if (!v) uiStore.closeModal() },
})

watch(isOpen, (open) => {
  if (open && serversStore.currentServer) {
    serverName.value = serversStore.currentServer.name
    error.value = ''
  }
})

async function handleSave() {
  const name = serverName.value.trim()
  if (!name || !serversStore.currentServer) return
  if (name === serversStore.currentServer.name) {
    uiStore.closeModal()
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    await serversStore.updateServer(serversStore.currentServer.id, { name })
    uiStore.closeModal()
  } catch {
    error.value = 'Failed to update server'
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
        <DialogTitle>Server Settings</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSave" class="space-y-4">
        <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="space-y-2">
          <Label for="settings-server-name">Server Name</Label>
          <Input
            id="settings-server-name"
            v-model="serverName"
            placeholder="Server name"
            required
          />
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">Cancel</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Save
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
