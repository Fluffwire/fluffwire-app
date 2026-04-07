<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { botApi } from '@/services/botApi'
import { useBotsStore } from '@/stores/bots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Bot as BotIcon, Trash2, Loader2, ChevronDown } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { BotMember } from '@/types'

const props = defineProps<{
  serverId: string
}>()

const botsStore = useBotsStore()
const serverBots = ref<BotMember[]>([])
const selectedBotId = ref<string>('')
const showAdvanced = ref(false)
const botIdInput = ref('')
const isLoading = ref(false)
const isAdding = ref(false)

// Delete confirmation state
const showDeleteDialog = ref(false)
const deletingBotId = ref<string | null>(null)
const deletingBotName = ref('')

// Filter out bots that are already in the server
const availableUserBots = computed(() => {
  const serverBotIds = new Set(serverBots.value.map(b => b.botId))
  return botsStore.userBots.filter(bot => !serverBotIds.has(bot.id))
})

onMounted(async () => {
  await Promise.all([
    fetchServerBots(),
    botsStore.fetchUserBots()
  ])
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
  const botId = showAdvanced.value ? botIdInput.value.trim() : selectedBotId.value

  if (!botId) {
    toast.error(showAdvanced.value ? 'Please enter a bot ID' : 'Please select a bot')
    return
  }

  isAdding.value = true
  try {
    await botApi.addBotToServer(props.serverId, botId)
    await fetchServerBots()

    // Reset form
    if (showAdvanced.value) {
      botIdInput.value = ''
    } else {
      selectedBotId.value = ''
    }

    // Trigger member sidebar refresh
    window.dispatchEvent(new CustomEvent('bot-member-updated', { detail: { serverId: props.serverId } }))

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

    // Trigger member sidebar refresh
    window.dispatchEvent(new CustomEvent('bot-member-updated', { detail: { serverId: props.serverId } }))

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
        <CardDescription>
          {{ showAdvanced ? 'Enter the ID of any bot to add it to this server' : 'Select one of your bots to add to this server' }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleAddBot" class="space-y-4">
          <!-- Simple mode: Select from your bots -->
          <div v-if="!showAdvanced" class="space-y-2">
            <Label for="bot-select">Your Bots</Label>
            <div class="flex gap-2">
              <Select v-model="selectedBotId">
                <SelectTrigger id="bot-select" class="flex-1">
                  <SelectValue placeholder="Select a bot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="bot in availableUserBots"
                    :key="bot.id"
                    :value="bot.id"
                  >
                    <div class="flex items-center gap-2">
                      <BotIcon class="h-4 w-4" />
                      <span>{{ bot.name }}</span>
                    </div>
                  </SelectItem>
                  <div v-if="availableUserBots.length === 0" class="px-2 py-6 text-center text-sm text-muted-foreground">
                    <p class="mb-2">No bots available</p>
                    <p class="text-xs">Create a bot in Settings → Developers</p>
                  </div>
                </SelectContent>
              </Select>
              <Button type="submit" :disabled="isAdding || !selectedBotId">
                <Loader2 v-if="isAdding" class="mr-2 h-4 w-4 animate-spin" />
                {{ isAdding ? 'Adding...' : 'Add Bot' }}
              </Button>
            </div>
          </div>

          <!-- Advanced mode: Enter bot ID manually -->
          <div v-else class="space-y-2">
            <Label for="bot-id">Bot ID</Label>
            <div class="flex gap-2">
              <Input
                id="bot-id"
                v-model="botIdInput"
                placeholder="Enter bot ID (UUID)"
                class="flex-1"
              />
              <Button type="submit" :disabled="isAdding || !botIdInput.trim()">
                <Loader2 v-if="isAdding" class="mr-2 h-4 w-4 animate-spin" />
                {{ isAdding ? 'Adding...' : 'Add Bot' }}
              </Button>
            </div>
          </div>

          <!-- Toggle advanced mode -->
          <div class="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="text-xs"
              @click="showAdvanced = !showAdvanced"
            >
              <ChevronDown :class="['h-3 w-3 mr-1 transition-transform', showAdvanced ? 'rotate-180' : '']" />
              {{ showAdvanced ? 'Select from your bots' : 'Enter bot ID manually' }}
            </Button>
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
