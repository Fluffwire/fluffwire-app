<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'
import api, { uploadFile } from '@/services/api'
import { serverApi } from '@/services/serverApi'
import type { Webhook, ServerInvite, Role } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRolesStore } from '@/stores/roles'
import { Permissions, PermissionLabels } from '@/constants/permissions'
import { Loader2, Camera, ShieldX, Webhook as WebhookIcon, Copy, Trash2, Plus, Pencil, Link, ScrollText } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const serversStore = useServersStore()
const channelsStore = useChannelsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const { isMobile } = useResponsive()

const rolesStore = useRolesStore()

const activeTab = ref<'general' | 'bans' | 'webhooks' | 'invites' | 'roles' | 'audit'>('general')
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
    toast.success(t('server.userUnbanned'))
  } catch {
    toast.error(t('server.failedUnban'))
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
    toast.success(t('server.webhookCreated'))
  } catch {
    toast.error(t('server.failedCreateWebhook'))
  }
}

async function deleteWebhook(webhookId: string) {
  if (!serversStore.currentServer) return
  try {
    await serverApi.deleteWebhook(serversStore.currentServer.id, webhookId)
    webhooks.value = webhooks.value.filter((w) => w.id !== webhookId)
    toast.success(t('server.webhookDeleted'))
  } catch {
    toast.error(t('server.failedDeleteWebhook'))
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
    toast.success(t('server.webhookUpdated'))
  } catch {
    toast.error(t('server.failedUpdateWebhook'))
  }
}

// Invites
const invites = ref<ServerInvite[]>([])
const invitesLoading = ref(false)

async function fetchInvites() {
  if (!serversStore.currentServer) return
  invitesLoading.value = true
  try {
    const { data } = await serverApi.getInvites(serversStore.currentServer.id)
    invites.value = data ?? []
  } catch { /* ignore */ } finally {
    invitesLoading.value = false
  }
}

async function handleCreateInvite() {
  if (!serversStore.currentServer) return
  try {
    const { data } = await serverApi.createInvite(serversStore.currentServer.id)
    invites.value.unshift(data)
    toast.success(t('server.inviteCreated'))
  } catch {
    toast.error(t('server.failedCreateInvite'))
  }
}

async function handleDeleteInvite(code: string) {
  if (!serversStore.currentServer) return
  try {
    await serverApi.deleteInvite(serversStore.currentServer.id, code)
    invites.value = invites.value.filter((i) => i.code !== code)
    toast.success(t('server.inviteDeleted'))
  } catch {
    toast.error(t('server.failedDeleteInvite'))
  }
}

function copyInviteCode(code: string) {
  navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`)
  toast.success(t('server.inviteLinkCopied'))
}

function copyWebhookUrl(webhook: Webhook) {
  const url = `${window.location.origin}/api/webhooks/${webhook.id}/${webhook.token}`
  navigator.clipboard.writeText(url)
  toast.success(t('server.webhookUrlCopied'))
}

// Roles
const roles = computed(() => {
  if (!serversStore.currentServer) return []
  return rolesStore.getRoles(serversStore.currentServer.id).slice().sort((a, b) => a.position - b.position)
})
const selectedRole = ref<Role | null>(null)
const editRoleName = ref('')
const editRoleColor = ref('')
const editRolePermissions = ref(0)
const roleColors = ['#e74c3c', '#e91e63', '#9b59b6', '#3498db', '#1abc9c', '#2ecc71', '#f39c12', '#e67e22', '#95a5a6']
const permissionLabels = PermissionLabels
const permissionValues = Permissions

async function fetchRoles() {
  if (!serversStore.currentServer) return
  try {
    await rolesStore.fetchRoles(serversStore.currentServer.id)
  } catch { /* ignore */ }
}

async function createNewRole() {
  if (!serversStore.currentServer) return
  try {
    const role = await rolesStore.createRole(serversStore.currentServer.id, 'New Role')
    selectRole(role)
    toast.success(t('server.roleCreated'))
  } catch {
    toast.error(t('server.failedCreateRole'))
  }
}

function selectRole(role: Role) {
  selectedRole.value = role
  editRoleName.value = role.name
  editRoleColor.value = role.color || '#99aab5'
  editRolePermissions.value = role.permissions
}

function hasEditPermission(perm: number): boolean {
  return (editRolePermissions.value & perm) !== 0
}

function togglePermission(perm: number) {
  editRolePermissions.value ^= perm
}

async function saveRole() {
  if (!serversStore.currentServer || !selectedRole.value) return
  try {
    const updated = await rolesStore.updateRole(serversStore.currentServer.id, selectedRole.value.id, {
      name: editRoleName.value.trim() || undefined,
      color: editRoleColor.value || undefined,
      permissions: editRolePermissions.value,
    })
    selectedRole.value = updated
    toast.success(t('server.roleUpdated'))
  } catch {
    toast.error(t('server.failedUpdateRole'))
  }
}

async function deleteSelectedRole() {
  if (!serversStore.currentServer || !selectedRole.value || selectedRole.value.isDefault) return
  try {
    await rolesStore.deleteRole(serversStore.currentServer.id, selectedRole.value.id)
    selectedRole.value = null
    toast.success(t('server.roleDeleted'))
  } catch {
    toast.error(t('server.failedDeleteRole'))
  }
}

// Server data export
const exportLimit = ref('10000')
const exportIsLoading = ref(false)

async function exportServerData() {
  if (!serversStore.currentServer) return
  exportIsLoading.value = true
  try {
    // Build query params
    const params = new URLSearchParams()
    const limitNum = Number(exportLimit.value)
    if (limitNum > 0) {
      params.append('limit', String(limitNum))
    }

    const url = `/servers/${serversStore.currentServer.id}/export${params.toString() ? `?${params.toString()}` : ''}`
    const { data } = await api.get(url)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${serversStore.currentServer.name}-export.json`
    a.click()
    URL.revokeObjectURL(downloadUrl)
    toast.success(t('server.dataExported'))
  } catch {
    toast.error(t('server.failedExportData'))
  } finally {
    exportIsLoading.value = false
  }
}

// Audit log
const auditEntries = ref<any[]>([])
const auditLoading = ref(false)
const auditHasMore = ref(false)

async function fetchAuditLog(before?: string) {
  if (!serversStore.currentServer) return
  auditLoading.value = true
  try {
    const url = before
      ? `/servers/${serversStore.currentServer.id}/audit-log?before=${before}`
      : `/servers/${serversStore.currentServer.id}/audit-log`
    const { data } = await api.get(url)
    if (before) {
      auditEntries.value.push(...data)
    } else {
      auditEntries.value = data
    }
    auditHasMore.value = data.length === 50
  } catch {
    // ignore
  } finally {
    auditLoading.value = false
  }
}

function loadMoreAudit() {
  const last = auditEntries.value[auditEntries.value.length - 1]
  if (last) fetchAuditLog(last.createdAt)
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
  if (tab === 'invites') fetchInvites()
  if (tab === 'roles') {
    selectedRole.value = null
    fetchRoles()
  }
  if (tab === 'audit') fetchAuditLog()
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
    error.value = t('server.failedUpdateServer')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent :class="[
      isMobile ? 'max-w-[95vw] max-h-[90vh] p-4' : 'sm:max-w-3xl max-h-[85vh]'
    ]">
      <div class="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <DialogHeader>
        <DialogTitle>{{ $t('server.serverSettings') }}</DialogTitle>
      </DialogHeader>

      <!-- Tabs (scrollable on mobile) -->
      <div v-if="isOwner" :class="[
        'flex gap-2 border-b border-border/50 pb-2',
        isMobile ? 'overflow-x-auto scrollbar-thin' : ''
      ]">
        <button
          @click="activeTab = 'general'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap', activeTab === 'general' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >{{ $t('server.general') }}</button>
        <button
          @click="activeTab = 'bans'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap', activeTab === 'bans' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >{{ $t('server.bans') }}</button>
        <button
          @click="activeTab = 'webhooks'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap', activeTab === 'webhooks' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >{{ $t('server.webhooks') }}</button>
        <button
          @click="activeTab = 'invites'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap', activeTab === 'invites' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >{{ $t('server.invites') }}</button>
        <button
          @click="activeTab = 'roles'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap', activeTab === 'roles' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >{{ $t('server.roles') }}</button>
        <button
          @click="activeTab = 'audit'"
          :class="['rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap', activeTab === 'audit' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >{{ $t('server.auditLog') }}</button>
      </div>

      <!-- Scrollable content container -->
      <div :class="[
        'overflow-y-auto',
        isMobile ? 'max-h-[calc(90vh-12rem)]' : 'max-h-[calc(85vh-12rem)]'
      ]">
        <!-- Bans tab -->
        <div v-if="activeTab === 'bans'" class="space-y-2">
        <p v-if="bansLoading" class="text-sm text-muted-foreground">{{ $t('server.loading') }}</p>
        <p v-else-if="bans.length === 0" class="text-sm text-muted-foreground">{{ $t('server.noBans') }}</p>
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
            {{ $t('server.unban') }}
          </Button>
        </div>
      </div>

      <!-- Webhooks tab -->
      <div v-if="activeTab === 'webhooks'" class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">{{ $t('server.manageWebhooks') }}</p>
          <Button size="sm" variant="outline" class="gap-1.5" @click="showCreateWebhook = !showCreateWebhook">
            <Plus class="h-3.5 w-3.5" />
            {{ $t('server.new') }}
          </Button>
        </div>

        <!-- Create form -->
        <div v-if="showCreateWebhook" class="space-y-2 rounded-lg border border-border/50 p-3">
          <div class="space-y-1">
            <Label for="webhook-name">{{ $t('server.name') }}</Label>
            <Input id="webhook-name" v-model="newWebhookName" :placeholder="$t('server.webhookNamePlaceholder')" />
          </div>
          <div class="space-y-1">
            <Label for="webhook-channel">{{ $t('server.channel') }}</Label>
            <select
              id="webhook-channel"
              v-model="newWebhookChannelId"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="" disabled>{{ $t('server.selectChannel') }}</option>
              <option v-for="ch in textChannels" :key="ch.id" :value="ch.id">
                #{{ ch.name }}
              </option>
            </select>
          </div>
          <div class="flex justify-end gap-2">
            <Button size="sm" variant="ghost" @click="showCreateWebhook = false">{{ $t('common.cancel') }}</Button>
            <Button size="sm" @click="createWebhook" :disabled="!newWebhookName.trim() || !newWebhookChannelId">{{ $t('common.create') }}</Button>
          </div>
        </div>

        <p v-if="webhooksLoading" class="text-sm text-muted-foreground">{{ $t('server.loading') }}</p>
        <p v-else-if="webhooks.length === 0 && !showCreateWebhook" class="text-sm text-muted-foreground">{{ $t('server.noWebhooks') }}</p>
        <div
          v-for="wh in webhooks"
          :key="wh.id"
          class="rounded-lg border border-border/50 px-3 py-2"
        >
          <!-- Editing mode -->
          <div v-if="editingWebhookId === wh.id" class="space-y-2">
            <div class="space-y-1">
              <Label>{{ $t('server.name') }}</Label>
              <Input v-model="editWebhookName" :placeholder="$t('server.webhookNamePlaceholder')" />
            </div>
            <div class="space-y-1">
              <Label>{{ $t('server.channel') }}</Label>
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
              <Button size="sm" variant="ghost" @click="cancelEditWebhook">{{ $t('common.cancel') }}</Button>
              <Button size="sm" @click="saveWebhook" :disabled="!editWebhookName.trim() || !editWebhookChannelId">{{ $t('common.save') }}</Button>
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

      <!-- Invites tab -->
      <div v-if="activeTab === 'invites'" class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">{{ $t('server.manageInvites') }}</p>
          <Button size="sm" variant="outline" class="gap-1.5" @click="handleCreateInvite">
            <Plus class="h-3.5 w-3.5" />
            {{ $t('common.create') }}
          </Button>
        </div>

        <p v-if="invitesLoading" class="text-sm text-muted-foreground">{{ $t('server.loading') }}</p>
        <p v-else-if="invites.length === 0" class="text-sm text-muted-foreground">{{ $t('server.noInvites') }}</p>
        <div
          v-for="inv in invites"
          :key="inv.code"
          class="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <Link class="h-4 w-4 shrink-0 text-muted-foreground" />
              <p class="truncate text-sm font-medium font-mono text-foreground">{{ inv.code }}</p>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ inv.creatorName || $t('server.unknown') }} &middot; {{ inv.uses }} uses
              <template v-if="inv.createdAt"> &middot; {{ new Date(inv.createdAt).toLocaleDateString() }}</template>
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" class="h-7 w-7 p-0" @click="copyInviteCode(inv.code)">
              <Copy class="h-3.5 w-3.5" />
            </Button>
            <Button v-if="isOwner" size="sm" variant="ghost" class="h-7 w-7 p-0 text-destructive hover:text-destructive" @click="handleDeleteInvite(inv.code)">
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Roles tab -->
      <div v-if="activeTab === 'roles'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-foreground">{{ $t('server.roles') }}</h3>
          <Button size="sm" @click="createNewRole">
            {{ $t('server.createRole') }}
          </Button>
        </div>

        <!-- Role list -->
        <div class="space-y-1">
          <button
            v-for="role in roles"
            :key="role.id"
            @click="selectRole(role)"
            :class="[
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
              selectedRole?.id === role.id ? 'bg-accent' : 'hover:bg-accent/50'
            ]"
          >
            <div
              class="h-3 w-3 rounded-full"
              :style="{ backgroundColor: role.color || '#99aab5' }"
            />
            <span class="text-foreground">{{ role.name }}</span>
            <span v-if="role.isDefault" class="ml-auto text-xs text-muted-foreground">default</span>
          </button>
        </div>

        <!-- Role editor -->
        <div v-if="selectedRole" class="space-y-4 rounded-lg border border-border p-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">{{ $t('server.roleName') }}</label>
            <Input v-model="editRoleName" :disabled="selectedRole.isDefault" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">{{ $t('server.roleColor') }}</label>
            <div class="flex gap-2">
              <button
                v-for="c in roleColors"
                :key="c"
                @click="editRoleColor = c"
                :class="['h-8 w-8 rounded-full border-2', editRoleColor === c ? 'border-foreground' : 'border-transparent']"
                :style="{ backgroundColor: c }"
              />
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">{{ $t('server.permissions') }}</label>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="(label, key) in permissionLabels"
                :key="key"
                class="flex items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  :checked="hasEditPermission(permissionValues[key as keyof typeof permissionValues])"
                  @update:checked="togglePermission(permissionValues[key as keyof typeof permissionValues])"
                />
                {{ label }}
              </label>
            </div>
          </div>
          <div class="flex gap-2">
            <Button size="sm" @click="saveRole">{{ $t('common.save') }}</Button>
            <Button v-if="!selectedRole.isDefault" size="sm" variant="destructive" @click="deleteSelectedRole">
              {{ $t('common.delete') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Audit Log tab -->
      <div v-if="activeTab === 'audit'" class="space-y-4">
        <p class="text-sm text-muted-foreground">{{ $t('server.auditLogDesc') }}</p>

        <div v-if="auditLoading" class="text-center text-muted-foreground">
          {{ $t('server.loading') }}
        </div>

        <div v-else-if="auditEntries.length === 0" class="text-center text-muted-foreground">
          {{ $t('server.noAuditEntries') }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="entry in auditEntries"
            :key="entry.id"
            class="flex items-start gap-3 rounded-lg border border-border p-3"
          >
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-foreground">{{ entry.action }}</div>
              <div v-if="entry.targetType" class="text-xs text-muted-foreground">
                {{ entry.targetType }}: {{ entry.targetId }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ new Date(entry.createdAt).toLocaleString() }}
              </div>
            </div>
          </div>

          <Button
            v-if="auditHasMore"
            variant="outline"
            class="w-full"
            @click="loadMoreAudit"
          >
            {{ $t('chat.loadMore') }}
          </Button>
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
          <span class="text-xs text-muted-foreground">{{ $t('server.clickToUpload') }}</span>
        </div>

        <div class="space-y-2">
          <Label for="settings-server-name">{{ $t('server.serverName') }}</Label>
          <Input
            id="settings-server-name"
            v-model="serverName"
            :placeholder="$t('server.serverNamePlaceholder')"
            required
          />
        </div>

        <!-- Export Messages (owner only) -->
        <div v-if="isOwner" class="rounded-lg border border-border/50 p-4 space-y-3">
          <h3 class="text-sm font-medium text-foreground">{{ $t('server.exportMessages') }}</h3>
          <p class="text-sm text-muted-foreground">{{ $t('server.exportMessagesDesc') }}</p>

          <div class="space-y-2">
            <Label for="exportLimit">Message Limit</Label>
            <Select v-model="exportLimit" id="exportLimit">
              <SelectTrigger>
                <SelectValue placeholder="Select limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">Last 10,000 per channel (recommended)</SelectItem>
                <SelectItem value="25000">Last 25,000 per channel</SelectItem>
                <SelectItem value="50000">Last 50,000 per channel (maximum)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" type="button" @click="exportServerData" :disabled="exportIsLoading">
            <Loader2 v-if="exportIsLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ $t('server.exportMessages') }}
          </Button>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">{{ $t('common.cancel') }}</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ $t('common.save') }}
          </Button>
        </DialogFooter>
      </form>
      </div>
      <!-- End scrollable content container -->

    </DialogContent>
  </Dialog>
</template>
