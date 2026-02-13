<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useServersStore } from '@/stores/servers'
import { useUiStore } from '@/stores/ui'
import { uploadFile } from '@/services/api'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Camera } from 'lucide-vue-next'

const serversStore = useServersStore()
const uiStore = useUiStore()

const serverName = ref('')
const iconUrl = ref<string | null>(null)
const iconFile = ref<File | null>(null)
const iconPreview = ref<string | null>(null)
const isLoading = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const isOpen = computed({
  get: () => uiStore.activeModal === 'serverSettings',
  set: (v) => { if (!v) uiStore.closeModal() },
})

watch(isOpen, (open) => {
  if (open && serversStore.currentServer) {
    serverName.value = serversStore.currentServer.name
    iconUrl.value = serversStore.currentServer.icon ?? null
    iconFile.value = null
    iconPreview.value = null
    error.value = ''
  }
})

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be under 5MB'
    return
  }
  iconFile.value = file
  iconPreview.value = URL.createObjectURL(file)
  error.value = ''
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const displayIcon = computed(() => iconPreview.value || iconUrl.value)

async function handleSave() {
  const name = serverName.value.trim()
  if (!name || !serversStore.currentServer) return

  isLoading.value = true
  error.value = ''
  try {
    const updates: Partial<{ name: string; icon: string }> = {}

    if (name !== serversStore.currentServer.name) {
      updates.name = name
    }

    if (iconFile.value) {
      const { url } = await uploadFile(iconFile.value)
      updates.icon = url
    }

    if (Object.keys(updates).length === 0) {
      uiStore.closeModal()
      return
    }

    await serversStore.updateServer(serversStore.currentServer.id, updates)
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

        <!-- Icon Upload -->
        <div class="flex flex-col items-center gap-3">
          <button
            type="button"
            @click="fileInput?.click()"
            class="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-secondary transition-all hover:opacity-80"
          >
            <img
              v-if="displayIcon"
              :src="displayIcon"
              alt="Server icon"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-lg font-semibold text-muted-foreground">
              {{ getInitials(serverName || 'S') }}
            </span>
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera class="h-6 w-6 text-white" />
            </div>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
          <span class="text-xs text-muted-foreground">Click to upload icon</span>
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
