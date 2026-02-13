<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { uploadFile } from '@/services/api'
import { serverApi } from '@/services/serverApi'
import type { Webhook } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Camera, ShieldX, Webhook as WebhookIcon, Copy, Trash2, Plus, Pencil } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const activeTab = ref<'general' | 'bans' | 'webhooks'>('general')
const serverName = ref('')
const iconUrl = ref<string | null>(null)
const iconFile = ref<File | null>(null)
const iconPreview = ref<string | null>(null)
const isLoading = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// Bans
const bans = ref<{ userId: string; username: string; bannedBy: string; reason: string; createdAt: string }[]>([])
const bansLoading = ref(false)
const isOwner = computed(() => serversStore.currentServer?.ownerId === authStore.user?.id)

async function fetchBans() {
  if (!serversStore.currentServer) return
  bansLoading.value = true
  try {
    const { data } = await serverApi.listBans(serversStore.currentServer.id)
    bans.value = data
  } catch { /* ignore */ } finally {
    bansLoading.value = false
  }
}

async function handleUnban(userId: string) {
  if (!serversStore.currentServer) return
  try {
    await serverApi.unbanMember(serversStore.currentServer.id, userId)
    bans.value = bans.value.filter((b) => b.userId !== userId)
    toast.success('User unbanned')
  } catch {
    toast.error('Failed to unban user')
  }
}

// Webhooks
const webhooks = ref<Webhook[]>([])
const webhooksLoading = ref(false)
const newWebhookName = ref('')
const newWebhookChannelId = ref('')
const showCreateWebhook = ref(false)

const textChannels = computed(() =>
  channelsStore.channels.filter((c) => c.type === 'text')
)

async function fetchWebhooks() {
  if (!serversStore.currentServer) return
  webhooksLoading.value = true
  try {
    const { data } = await serverApi.listWebhooks(serversStore.currentServer.id)
    webhooks.value = data
  } catch { /* ignore */ } finally {
    webhooksLoading.value = false
  }
}

async function createWebhook() {
  if (!serversStore.currentServer || !newWebhookName.value.trim() || !newWebhookChannelId.value) return
  try {
    const { data } = await serverApi.createWebhook(serversStore.currentServer.id, newWebhookName.value.trim(), newWebhookChannelId.value)
    webhooks.value.push(data)
    newWebhookName.value = ''
    newWebhookChannelId.value = ''
    showCreateWebhook.value = false
    toast.success('Webhook created')
  } catch {
    toast.error('Failed to create webhook')
  }
}

async function deleteWebhook(webhookId: string) {
  if (!serversStore.currentServer) return
  try {
    await serverApi.deleteWebhook(serversStore.currentServer.id, webhookId)
    webhooks.value = webhooks.value.filter((w) => w.id !== webhookId)
    toast.success('Webhook deleted')
  } catch {
    toast.error('Failed to delete webhook')
  }
}

// Webhook editing
const editingWebhookId = ref<string | null>(null)
const editWebhookName = ref('')
const editWebhookChannelId = ref('')

function startEditWebhook(wh: Webhook) {
  editingWebhookId.value = wh.id
  editWebhookName.value = wh.name
  editWebhookChannelId.value = wh.channelId
}

function cancelEditWebhook() {
  editingWebhookId.value = null
  editWebhookName.value = ''
  editWebhookChannelId.value = ''
}

async function saveWebhook() {
  if (!serversStore.currentServer || !editingWebhookId.value) return
  try {
    const { data } = await serverApi.updateWebhook(
      serversStore.currentServer.id,
      editingWebhookId.value,
      { name: editWebhookName.value.trim(), channelId: editWebhookChannelId.value },
    )
    const idx = webhooks.value.findIndex((w) => w.id === data.id)
    if (idx !== -1) webhooks.value[idx] = data
    cancelEditWebhook()
    toast.success('Webhook updated')
  } catch {
    toast.error('Failed to update webhook')
  }
}

function copyWebhookUrl(webhook: Webhook) {
  const url = `${window.location.origin}/api/webhooks/${webhook.id}/${webhook.token}`
  navigator.clipboard.writeText(url)
  toast.success('Webhook URL copied')
}

const isOpen = computed({
  get: () => uiStore.activeModal === 'serverSettings',
  set: (v) => { if (!v) uiStore.closeModal() },
})

watch(isOpen, (open) => {
  if (open && serversStore.currentServer) {
    activeTab.value = 'general'
    serverName.value = serversStore.currentServer.name
    iconUrl.value = serversStore.currentServer.icon ?? null
    iconFile.value = null
    iconPreview.value = null
    error.value = ''
  }
})

watch(activeTab, (tab) => {
  if (tab === 'bans') fetchBans()
  if (tab === 'webhooks') fetchWebhooks()
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

      <!-- Tabs -->
      <div v-if="isOwner" class="flex gap-2 border-b border-border/50 pb-2">
        <button
          @click="activeTab = 'general'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors', activeTab === 'general' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >General</button>
        <button
          @click="activeTab = 'bans'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors', activeTab === 'bans' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >Bans</button>
        <button
          @click="activeTab = 'webhooks'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors', activeTab === 'webhooks' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >Webhooks</button>
      </div>

      <!-- Bans tab -->
      <div v-if="activeTab === 'bans'" class="space-y-2">
        <p v-if="bansLoading" class="text-sm text-muted-foreground">Loading...</p>
        <p v-else-if="bans.length === 0" class="text-sm text-muted-foreground">No banned users</p>
        <div
          v-for="ban in bans"
          :key="ban.userId"
          class="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
        >
          <div>
            <p class="text-sm font-medium text-foreground">{{ ban.username }}</p>
            <p v-if="ban.reason" class="text-xs text-muted-foreground">{{ ban.reason }}</p>
          </div>
          <Button size="sm" variant="outline" class="gap-1.5 text-destructive" @click="handleUnban(ban.userId)">
            <ShieldX class="h-3.5 w-3.5" />
            Unban
          </Button>
        </div>
      </div>

      <!-- Webhooks tab -->
      <div v-if="activeTab === 'webhooks'" class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">Manage webhooks for this server</p>
          <Button size="sm" variant="outline" class="gap-1.5" @click="showCreateWebhook = !showCreateWebhook">
            <Plus class="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        <!-- Create form -->
        <div v-if="showCreateWebhook" class="space-y-2 rounded-lg border border-border/50 p-3">
          <div class="space-y-1">
            <Label for="webhook-name">Name</Label>
            <Input id="webhook-name" v-model="newWebhookName" placeholder="Webhook name" />
          </div>
          <div class="space-y-1">
            <Label for="webhook-channel">Channel</Label>
            <select
              id="webhook-channel"
              v-model="newWebhookChannelId"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="" disabled>Select a channel</option>
              <option v-for="ch in textChannels" :key="ch.id" :value="ch.id">
                #{{ ch.name }}
              </option>
            </select>
          </div>
          <div class="flex justify-end gap-2">
            <Button size="sm" variant="ghost" @click="showCreateWebhook = false">Cancel</Button>
            <Button size="sm" @click="createWebhook" :disabled="!newWebhookName.trim() || !newWebhookChannelId">Create</Button>
          </div>
        </div>

        <p v-if="webhooksLoading" class="text-sm text-muted-foreground">Loading...</p>
        <p v-else-if="webhooks.length === 0 && !showCreateWebhook" class="text-sm text-muted-foreground">No webhooks yet</p>
        <div
          v-for="wh in webhooks"
          :key="wh.id"
          class="rounded-lg border border-border/50 px-3 py-2"
        >
          <!-- Editing mode -->
          <div v-if="editingWebhookId === wh.id" class="space-y-2">
            <div class="space-y-1">
              <Label>Name</Label>
              <Input v-model="editWebhookName" placeholder="Webhook name" />
            </div>
            <div class="space-y-1">
              <Label>Channel</Label>
              <select
                v-model="editWebhookChannelId"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option v-for="ch in textChannels" :key="ch.id" :value="ch.id">
                  #{{ ch.name }}
                </option>
              </select>
            </div>
            <div class="flex justify-end gap-2">
              <Button size="sm" variant="ghost" @click="cancelEditWebhook">Cancel</Button>
              <Button size="sm" @click="saveWebhook" :disabled="!editWebhookName.trim() || !editWebhookChannelId">Save</Button>
            </div>
          </div>
          <!-- Read-only mode -->
          <div v-else class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <WebhookIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
                <p class="truncate text-sm font-medium text-foreground">{{ wh.name }}</p>
              </div>
              <p class="text-xs text-muted-foreground">
                #{{ textChannels.find((c) => c.id === wh.channelId)?.name ?? 'unknown' }}
              </p>
            </div>
            <div class="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" class="h-7 w-7 p-0" @click="startEditWebhook(wh)">
                <Pencil class="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" class="h-7 w-7 p-0" @click="copyWebhookUrl(wh)">
                <Copy class="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" class="h-7 w-7 p-0 text-destructive hover:text-destructive" @click="deleteWebhook(wh.id)">
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <form v-if="activeTab === 'general'" @submit.prevent="handleSave" class="space-y-4">
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
