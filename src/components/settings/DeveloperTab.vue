<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBotsStore } from '@/stores/bots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, RotateCw, Copy, Check, Bot as BotIcon, Camera } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { uploadFile } from '@/services/api'
import type { Bot } from '@/types'

const botsStore = useBotsStore()

// Create form state
const showCreateForm = ref(false)
const newBotName = ref('')
const newBotDescription = ref('')
const isCreating = ref(false)

// Edit state
const editingBotId = ref<string | null>(null)
const editName = ref('')
const editDescription = ref('')

// Token modal state
const showTokenModal = ref(false)
const currentToken = ref('')
const tokenCopied = ref(false)

// Delete confirmation state
const showDeleteDialog = ref(false)
const deletingBotId = ref<string | null>(null)

// Regenerate token confirmation state
const showRegenerateDialog = ref(false)
const regeneratingBotId = ref<string | null>(null)

// Avatar upload state
const avatarInputRef = ref<HTMLInputElement | null>(null)
const uploadingAvatarForBotId = ref<string | null>(null)
const avatarUploading = ref<string | null>(null)

onMounted(() => {
  botsStore.fetchUserBots()
})

async function handleCreate() {
  if (!newBotName.value.trim()) {
    toast.error('Bot name is required')
    return
  }

  isCreating.value = true
  try {
    const botWithToken = await botsStore.createBot({
      name: newBotName.value.trim(),
      description: newBotDescription.value.trim() || undefined,
    })
    currentToken.value = botWithToken.token
    showTokenModal.value = true
    showCreateForm.value = false
    newBotName.value = ''
    newBotDescription.value = ''
    toast.success('Bot created successfully')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } }
    toast.error(err.response?.data?.error || 'Failed to create bot')
  } finally {
    isCreating.value = false
  }
}

function cancelCreate() {
  showCreateForm.value = false
  newBotName.value = ''
  newBotDescription.value = ''
}

function startEdit(bot: Bot) {
  editingBotId.value = bot.id
  editName.value = bot.name
  editDescription.value = bot.description || ''
}

async function saveEdit(botId: string) {
  if (!editName.value.trim()) {
    toast.error('Bot name is required')
    return
  }

  try {
    await botsStore.updateBot(botId, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
    })
    editingBotId.value = null
    toast.success('Bot updated successfully')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } }
    toast.error(err.response?.data?.error || 'Failed to update bot')
  }
}

function cancelEdit() {
  editingBotId.value = null
  editName.value = ''
  editDescription.value = ''
}

function confirmDelete(botId: string) {
  deletingBotId.value = botId
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingBotId.value) return

  try {
    await botsStore.deleteBot(deletingBotId.value)
    showDeleteDialog.value = false
    deletingBotId.value = null
    toast.success('Bot deleted successfully')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } }
    toast.error(err.response?.data?.error || 'Failed to delete bot')
  }
}

function confirmRegenerateToken(botId: string) {
  regeneratingBotId.value = botId
  showRegenerateDialog.value = true
}

async function handleRegenerateToken() {
  if (!regeneratingBotId.value) return

  try {
    const newToken = await botsStore.regenerateToken(regeneratingBotId.value)
    currentToken.value = newToken
    showRegenerateDialog.value = false
    regeneratingBotId.value = null
    showTokenModal.value = true
    toast.success('Token regenerated successfully')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } }
    toast.error(err.response?.data?.error || 'Failed to regenerate token')
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(currentToken.value)
    tokenCopied.value = true
    toast.success('Token copied to clipboard')
    setTimeout(() => {
      tokenCopied.value = false
    }, 2000)
  } catch {
    toast.error('Failed to copy token')
  }
}

function closeTokenModal() {
  showTokenModal.value = false
  // Clear token from memory after a short delay
  setTimeout(() => {
    currentToken.value = ''
  }, 100)
}

function triggerAvatarUpload(botId: string) {
  uploadingAvatarForBotId.value = botId
  avatarInputRef.value?.click()
}

async function handleAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !uploadingAvatarForBotId.value) return
  input.value = ''

  const botId = uploadingAvatarForBotId.value
  uploadingAvatarForBotId.value = null
  avatarUploading.value = botId

  try {
    const { url } = await uploadFile(file)
    await botsStore.updateBot(botId, { avatar: url })
    toast.success('Avatar updated')
  } catch {
    toast.error('Failed to update avatar')
  } finally {
    avatarUploading.value = null
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Your Bots</h3>
        <p class="text-sm text-muted-foreground">Create and manage bots for automation and integrations</p>
      </div>
      <Button v-if="!showCreateForm" size="sm" @click="showCreateForm = true">
        <Plus class="mr-2 h-4 w-4" />
        New Bot
      </Button>
    </div>

    <!-- Create form -->
    <Card v-if="showCreateForm">
      <form @submit.prevent="handleCreate">
        <CardHeader>
          <CardTitle>Create Bot</CardTitle>
          <CardDescription>Bots can send messages and interact with your servers</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="bot-name">Name</Label>
            <Input
              id="bot-name"
              v-model="newBotName"
              placeholder="My Bot"
              required
              maxlength="32"
            />
          </div>
          <div class="space-y-2">
            <Label for="bot-description">Description (optional)</Label>
            <Textarea
              id="bot-description"
              v-model="newBotDescription"
              placeholder="A brief description of what this bot does"
              maxlength="200"
              rows="3"
            />
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <Button variant="ghost" type="button" @click="cancelCreate">Cancel</Button>
          <Button type="submit" :disabled="isCreating">
            {{ isCreating ? 'Creating...' : 'Create Bot' }}
          </Button>
        </CardFooter>
      </form>
    </Card>

    <!-- Loading state -->
    <div v-if="botsStore.isLoading" class="flex items-center justify-center py-8">
      <div class="text-sm text-muted-foreground">Loading bots...</div>
    </div>

    <!-- Empty state -->
    <Card v-else-if="botsStore.userBots.length === 0 && !showCreateForm">
      <CardContent class="flex flex-col items-center justify-center py-12">
        <BotIcon class="h-12 w-12 text-muted-foreground mb-4" />
        <p class="text-sm text-muted-foreground mb-4">You haven't created any bots yet</p>
        <Button size="sm" @click="showCreateForm = true">
          <Plus class="mr-2 h-4 w-4" />
          Create Your First Bot
        </Button>
      </CardContent>
    </Card>

    <!-- Bot list -->
    <div v-else class="space-y-3">
      <Card v-for="bot in botsStore.userBots" :key="bot.id">
        <CardContent class="pt-6">
          <!-- View mode -->
          <div v-if="editingBotId !== bot.id">
            <div class="flex items-start gap-4">
              <button
                class="group relative shrink-0"
                type="button"
                :disabled="avatarUploading === bot.id"
                title="Upload avatar"
                @click="triggerAvatarUpload(bot.id)"
              >
                <UserAvatar :src="bot.avatar" :alt="bot.name" size="md" :is-bot="true" />
                <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <div v-if="avatarUploading === bot.id" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <Camera v-else class="h-4 w-4 text-white" />
                </div>
              </button>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-semibold">{{ bot.name }}</h4>
                  <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">BOT</span>
                </div>
                <p v-if="bot.description" class="text-sm text-muted-foreground mb-2">{{ bot.description }}</p>
                <p class="text-xs text-muted-foreground">Created {{ formatDate(bot.createdAt) }}</p>
              </div>
              <div class="flex gap-2">
                <Button variant="ghost" size="sm" @click="startEdit(bot)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="confirmRegenerateToken(bot.id)">
                  <RotateCw class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="confirmDelete(bot.id)">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else>
            <form class="space-y-4" @submit.prevent="saveEdit(bot.id)">
              <div class="flex items-center gap-4">
                <button
                  class="group relative shrink-0"
                  type="button"
                  :disabled="avatarUploading === bot.id"
                  title="Upload avatar"
                  @click="triggerAvatarUpload(bot.id)"
                >
                  <UserAvatar :src="bot.avatar" :alt="bot.name" size="md" :is-bot="true" />
                  <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <div v-if="avatarUploading === bot.id" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <Camera v-else class="h-4 w-4 text-white" />
                  </div>
                </button>
                <p class="text-xs text-muted-foreground">Click avatar to upload image</p>
              </div>
              <div class="space-y-2">
                <Label>Name</Label>
                <Input v-model="editName" placeholder="Bot Name" required maxlength="32" />
              </div>
              <div class="space-y-2">
                <Label>Description</Label>
                <Textarea v-model="editDescription" placeholder="Description (optional)" maxlength="200" rows="3" />
              </div>
              <div class="flex justify-end gap-2">
                <Button variant="ghost" type="button" @click="cancelEdit">Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Token Modal -->
    <AlertDialog :open="showTokenModal" @update:open="(open) => !open && closeTokenModal()">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bot Token</AlertDialogTitle>
          <AlertDialogDescription>
            This token will not be shown again. Copy it now and store it securely. Anyone with this token can control your bot.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div class="rounded-md bg-muted p-3">
          <code class="block break-all text-xs font-mono">{{ currentToken }}</code>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" @click="copyToken">
            <Check v-if="tokenCopied" class="mr-2 h-4 w-4" />
            <Copy v-else class="mr-2 h-4 w-4" />
            {{ tokenCopied ? 'Copied!' : 'Copy Token' }}
          </Button>
          <AlertDialogAction @click="closeTokenModal">Done</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="(open) => !open && (showDeleteDialog = false)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Bot</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this bot? This action cannot be undone. The bot will be removed from all servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Delete Bot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Hidden avatar file input (shared, keyed by uploadingAvatarForBotId) -->
    <input
      ref="avatarInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleAvatarFileChange"
    >

    <!-- Regenerate Token Confirmation Dialog -->
    <AlertDialog :open="showRegenerateDialog" @update:open="(open) => !open && (showRegenerateDialog = false)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate Token</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to regenerate this bot's token? The old token will immediately stop working.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="handleRegenerateToken">
            Regenerate Token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
