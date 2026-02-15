<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { serverApi } from '@/services/serverApi'
import { useUiStore } from '@/stores/ui'
import { isTauri } from '@/utils/platform'
import type { ServerInvite } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Check, Loader2, Trash2, Plus } from 'lucide-vue-next'

const { t } = useI18n()
const uiStore = useUiStore()

const inviteLink = ref('')
const isLoading = ref(false)
const isCreating = ref(false)
const copied = ref(false)
const invitesList = ref<ServerInvite[]>([])

// Form fields
const expiresIn = ref<string>('0') // 0 = never
const maxUses = ref<string>('0') // 0 = unlimited

const expirationOptions = [
  { label: 'Never', value: '0' },
  { label: '30 minutes', value: String(30 * 60) },
  { label: '1 hour', value: String(60 * 60) },
  { label: '6 hours', value: String(6 * 60 * 60) },
  { label: '12 hours', value: String(12 * 60 * 60) },
  { label: '1 day', value: String(24 * 60 * 60) },
  { label: '7 days', value: String(7 * 24 * 60 * 60) },
]

const maxUsesOptions = [
  { label: 'Unlimited', value: '0' },
  { label: '1 use', value: '1' },
  { label: '5 uses', value: '5' },
  { label: '10 uses', value: '10' },
  { label: '25 uses', value: '25' },
  { label: '50 uses', value: '50' },
  { label: '100 uses', value: '100' },
]

const isOpen = computed({
  get: () => uiStore.activeModal === 'invite',
  set: (v) => { if (!v) uiStore.closeModal() },
})

watch(() => uiStore.activeModal, async (modal) => {
  if (modal === 'invite' && uiStore.modalData) {
    await loadInvites()
  } else {
    // Reset form when modal closes
    inviteLink.value = ''
    expiresIn.value = '0'
    maxUses.value = '0'
    invitesList.value = []
  }
})

async function loadInvites() {
  isLoading.value = true
  try {
    const serverId = uiStore.modalData as string
    const { data } = await serverApi.getInvites(serverId)
    invitesList.value = data
  } catch {
    invitesList.value = []
  } finally {
    isLoading.value = false
  }
}

async function createInvite() {
  isCreating.value = true
  try {
    const serverId = uiStore.modalData as string
    const options: { expiresIn?: number; maxUses?: number } = {}

    const expiresInNum = Number(expiresIn.value)
    if (expiresInNum > 0) {
      options.expiresIn = expiresInNum
    }

    const maxUsesNum = Number(maxUses.value)
    if (maxUsesNum > 0) {
      options.maxUses = maxUsesNum
    }

    const { data } = await serverApi.createInvite(serverId, options)

    // Generate link
    const origin = isTauri() ? 'https://app.fluffwire.com' : window.location.origin
    inviteLink.value = `${origin}/invite/${data.code}`

    // Reload invites list
    await loadInvites()
  } catch {
    inviteLink.value = 'Failed to generate invite'
  } finally {
    isCreating.value = false
  }
}

async function deleteInvite(code: string) {
  try {
    const serverId = uiStore.modalData as string
    await serverApi.deleteInvite(serverId, code)
    await loadInvites()

    // Clear the invite link if it matches the deleted code
    if (inviteLink.value.includes(code)) {
      inviteLink.value = ''
    }
  } catch {
    // Handle error
  }
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(inviteLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function formatExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return 'Never'
  const date = new Date(expiresAt)
  const now = new Date()
  if (date < now) return 'Expired'

  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return '<1h'
}

function formatUses(invite: ServerInvite): string {
  if (invite.maxUses === null) return `${invite.uses} uses`
  return `${invite.uses}/${invite.maxUses}`
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ $t('server.inviteModal') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Create New Invite Section -->
        <div class="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h3 class="font-medium">Create New Invite</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="expires">Expires After</Label>
              <Select v-model="expiresIn" id="expires">
                <SelectTrigger>
                  <SelectValue placeholder="Never" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in expirationOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="maxUses">Max Uses</Label>
              <Select v-model="maxUses" id="maxUses">
                <SelectTrigger>
                  <SelectValue placeholder="Unlimited" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in maxUsesOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button @click="createInvite" :disabled="isCreating" class="w-full">
            <Plus v-if="!isCreating" class="mr-2 h-4 w-4" />
            <Loader2 v-else class="mr-2 h-4 w-4 animate-spin" />
            Create Invite
          </Button>

          <!-- Show generated link -->
          <div v-if="inviteLink && !inviteLink.includes('Failed')" class="flex items-center gap-2">
            <Input :model-value="inviteLink" readonly class="flex-1 font-mono text-sm" />
            <Button size="sm" @click="copyToClipboard" variant="outline">
              <Check v-if="copied" class="h-4 w-4" />
              <Copy v-else class="h-4 w-4" />
            </Button>
          </div>
          <p v-else-if="inviteLink" class="text-sm text-destructive">{{ inviteLink }}</p>
        </div>

        <!-- Invites List Section -->
        <div class="space-y-3">
          <h3 class="font-medium">Active Invites</h3>

          <div v-if="isLoading" class="flex justify-center py-8">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>

          <div v-else-if="invitesList.length === 0" class="text-center py-8 text-muted-foreground text-sm">
            No active invites
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="invite in invitesList"
              :key="invite.code"
              class="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <code class="text-sm font-mono bg-muted px-2 py-0.5 rounded">{{ invite.code }}</code>
                  <span class="text-xs text-muted-foreground">by {{ invite.creatorName || 'Unknown' }}</span>
                </div>
                <div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{{ formatUses(invite) }}</span>
                  <span>Expires: {{ formatExpiresAt(invite.expiresAt) }}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                @click="deleteInvite(invite.code)"
                class="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
