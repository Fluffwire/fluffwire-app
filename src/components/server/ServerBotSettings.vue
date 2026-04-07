<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { botApi } from '@/services/botApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Bot as BotIcon, Trash2, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { BotMember } from '@/types'

const props = defineProps<{
  serverId: string
}>()

const serverBots = ref<BotMember[]>([])
const botIdInput = ref('')
const isLoading = ref(false)
const isAdding = ref(false)

// Delete confirmation state
const showDeleteDialog = ref(false)
const deletingBotId = ref<string | null>(null)
const deletingBotName = ref('')

onMounted(() => {
  fetchServerBots()
})

async function fetchServerBots() {
  if (!props.serverId) return
  isLoading.value = true
  try {
    const { data } = await botApi.listServerBots(props.serverId)
    serverBots.value = data
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load bots')
  } finally {
    isLoading.value = false
  }
}

async function handleAddBot() {
  if (!botIdInput.value.trim()) {
    toast.error('Please enter a bot ID')
    return
  }

  isAdding.value = true
  try {
    await botApi.addBotToServer(props.serverId, botIdInput.value.trim())
    await fetchServerBots()
    botIdInput.value = ''
    toast.success('Bot added to server')
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to add bot')
  } finally {
    isAdding.value = false
  }
}

function confirmRemoveBot(botId: string, botName: string) {
  deletingBotId.value = botId
  deletingBotName.value = botName
  showDeleteDialog.value = true
}

async function handleRemoveBot() {
  if (!deletingBotId.value) return

  try {
    await botApi.removeBotFromServer(props.serverId, deletingBotId.value)
    serverBots.value = serverBots.value.filter(b => b.botId !== deletingBotId.value)
    showDeleteDialog.value = false
    deletingBotId.value = null
    deletingBotName.value = ''
    toast.success('Bot removed from server')
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to remove bot')
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
    <!-- Add bot form -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Add Bot</CardTitle>
        <CardDescription>Add a bot to this server by entering its ID</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleAddBot" class="space-y-4">
          <div class="space-y-2">
            <Label for="bot-id">Bot ID</Label>
            <div class="flex gap-2">
              <Input
                id="bot-id"
                v-model="botIdInput"
                placeholder="Enter bot ID"
                class="flex-1"
              />
              <Button type="submit" :disabled="isAdding || !botIdInput.trim()">
                <Loader2 v-if="isAdding" class="mr-2 h-4 w-4 animate-spin" />
                {{ isAdding ? 'Adding...' : 'Add Bot' }}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="text-sm text-muted-foreground">Loading bots...</div>
    </div>

    <!-- Empty state -->
    <Card v-else-if="serverBots.length === 0">
      <CardContent class="flex flex-col items-center justify-center py-12">
        <BotIcon class="h-12 w-12 text-muted-foreground mb-4" />
        <p class="text-sm text-muted-foreground">No bots in this server yet</p>
      </CardContent>
    </Card>

    <!-- Bot list -->
    <div v-else class="space-y-3">
      <div v-for="botMember in serverBots" :key="botMember.botId">
        <div class="flex items-center justify-between rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BotIcon class="h-5 w-5 text-primary" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium">{{ botMember.bot.name }}</p>
                <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">BOT</span>
              </div>
              <p v-if="botMember.bot.description" class="text-xs text-muted-foreground">
                {{ botMember.bot.description }}
              </p>
              <p class="text-xs text-muted-foreground">
                Added {{ formatDate(botMember.addedAt) }}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            @click="confirmRemoveBot(botMember.botId, botMember.bot.name)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="(open) => !open && (showDeleteDialog = false)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Bot</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{{ deletingBotName }}</strong> from this server?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="handleRemoveBot" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove Bot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
