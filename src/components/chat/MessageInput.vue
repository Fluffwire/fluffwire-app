<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useMembersStore } from '@/stores/members'
import { useChannelsStore } from '@/stores/channels'
import { useLabelsStore } from '@/stores/labels'
import { useAuthStore } from '@/stores/auth'
import { useDraftsStore } from '@/stores/drafts'
import { canBypassChannelRestrictions } from '@/constants/tiers'
import type { Tier } from '@/constants/tiers'
import { messageApi } from '@/services/messageApi'
import { uploadFile } from '@/services/api'
import { wsService } from '@/services/websocket'
import { searchEmojis, shortcodeToEmoji } from '@/data/emojiShortcodes'
import type { EmojiData } from '@/data/emojiShortcodes'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import FilePreview from './FilePreview.vue'
import EmojiPicker from './EmojiPicker.vue'
import { SendHorizontal, Paperclip, Smile, Loader2, CornerDownRight, X, Hash } from 'lucide-vue-next'

interface Props {
  channelId: string
  channelName: string
}

const props = defineProps<Props>()
const { t } = useI18n()
const route = useRoute()
const messagesStore = useMessagesStore()
const membersStore = useMembersStore()
const channelsStore = useChannelsStore()
const labelsStore = useLabelsStore()
const authStore = useAuthStore()
const draftsStore = useDraftsStore()

const replyingTo = computed(() => messagesStore.getReplyTo(props.channelId))

const currentChannel = computed(() => channelsStore.channels.find(c => c.id === props.channelId))
const serverId = computed(() => route.params.serverId as string)

// Check if user can write to this channel
const canWrite = computed(() => {
  const channel = currentChannel.value
  if (!channel) return true // Allow for DMs or unknown channels
  if (!serverId.value || serverId.value === '@me') return true // DMs always allowed

  // Get user's tier and labels
  const member = membersStore.getMembers(serverId.value).find(m => m.userId === authStore.user?.id)
  if (!member) return false

  const tier = member.tier as Tier

  // Owner/Admin/Moderator bypass all restrictions
  if (canBypassChannelRestrictions(tier)) return true

  const accessMode = channel.accessMode || 'open'
  const userLabelIds = member.labels || []

  switch (accessMode) {
    case 'open':
      return true
    case 'read_only':
      return false
    case 'private':
      // Must be in allowed users or have allowed label
      const allowedUserIds = channel.allowedUserIds || []
      const allowedLabelIds = channel.allowedLabelIds || []
      return allowedUserIds.includes(member.userId) || userLabelIds.some(id => allowedLabelIds.includes(id))
    case 'restricted_write':
      // Can read but only write if whitelisted
      const allowedWriteUsers = channel.allowedUserIds || []
      const allowedWriteLabels = channel.allowedLabelIds || []
      return allowedWriteUsers.includes(member.userId) || userLabelIds.some(id => allowedWriteLabels.includes(id))
    default:
      return true
  }
})

const content = ref('')
const pendingFiles = ref<File[]>([])
const isSending = ref(false)
const showEmojiPicker = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const lastTypingSent = ref(0)
const showMentionPopup = ref(false)
const mentionQuery = ref('')
const mentionIndex = ref(0)

// Emoji autocomplete state
const showEmojiAutocomplete = ref(false)
const emojiQuery = ref('')
const emojiIndex = ref(0)

// Mention type tracking
const mentionType = ref<'user' | 'channel'>('user')

interface MentionResult {
  type: 'user' | 'label' | 'channel'
  id: string
  name: string
  displayName: string
  avatar?: string | null
  color?: string
  channelType?: 'text' | 'voice' // For channel icon
}

const mentionResults = computed((): MentionResult[] => {
  const serverIdValue = route.params.serverId as string
  if (!serverIdValue || serverIdValue === '@me') return []

  const query = mentionQuery.value.toLowerCase()
  const results: MentionResult[] = []

  if (mentionType.value === 'user') {
    // Add matching members
    const members = membersStore.getMembers(serverIdValue)
    members
      .filter(m =>
        m.user.username.toLowerCase().includes(query) ||
        m.user.displayName.toLowerCase().includes(query)
      )
      .forEach(m => {
        results.push({
          type: 'user',
          id: m.user.id,
          name: m.user.username,
          displayName: m.user.displayName,
          avatar: m.user.avatar ?? undefined,
        })
      })

    // Add matching labels
    const labels = labelsStore.getLabels(serverIdValue)
    labels
      .filter(l => l.name.toLowerCase().includes(query))
      .forEach(l => {
        results.push({
          type: 'label',
          id: l.id,
          name: l.name,
          displayName: l.name,
          color: l.color,
        })
      })
  } else if (mentionType.value === 'channel') {
    // Add matching channels (text channels only)
    const channels = channelsStore.textChannels
    channels
      .filter(c => c.name.toLowerCase().includes(query))
      .forEach(c => {
        results.push({
          type: 'channel',
          id: c.id,
          name: c.name,
          displayName: c.name,
          channelType: c.type,
        })
      })
  }

  return results.slice(0, 8)
})

// Emoji autocomplete results
const emojiResults = computed((): EmojiData[] => {
  if (emojiQuery.value.length < 3) return []
  return searchEmojis(emojiQuery.value)
})

const wsConnected = ref(wsService.isConnected)
const unsubConnection = wsService.addConnectionListener((connected) => {
  wsConnected.value = connected
})
onBeforeUnmount(() => unsubConnection())

// Flag to prevent saving when loading a draft
const isLoadingDraft = ref(false)

// Load draft when channelId changes
watch(() => props.channelId, (newChannelId) => {
  if (newChannelId) {
    isLoadingDraft.value = true
    content.value = draftsStore.getDraft(newChannelId)
    nextTick(() => {
      isLoadingDraft.value = false
    })
  }
}, { immediate: true })

// Save draft on content change (debounced)
let draftTimer: ReturnType<typeof setTimeout> | null = null
watch(content, (newContent) => {
  // Don't save if we're currently loading a draft
  if (isLoadingDraft.value) return

  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (props.channelId) {
      draftsStore.setDraft(props.channelId, newContent)
    }
  }, 500) // 500ms debounce
})

// Auto-focus input when replying to a message
watch(replyingTo, (newReply) => {
  if (newReply) {
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

function emitTyping() {
  const now = Date.now()
  if (now - lastTypingSent.value < 3000) return
  lastTypingSent.value = now
  messageApi.sendTyping(props.channelId).catch(() => {})
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
    input.value = ''
  }
}

function addFiles(files: File[]) {
  const maxSize = 10 * 1024 * 1024 // 10 MB
  for (const file of files) {
    if (file.size > maxSize) continue
    if (pendingFiles.value.length >= 5) break
    pendingFiles.value.push(file)
  }
}

function removeFile(index: number) {
  pendingFiles.value.splice(index, 1)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files) {
    addFiles(Array.from(e.dataTransfer.files))
  }
}

function checkForMention() {
  const ta = textareaRef.value
  if (!ta) return
  const pos = ta.selectionStart
  const text = content.value.substring(0, pos)

  // Check for channel mention (#text)
  const channelMatch = text.match(/#(\w*)$/)
  if (channelMatch) {
    mentionQuery.value = channelMatch[1] ?? ''
    mentionType.value = 'channel'
    showMentionPopup.value = true
    mentionIndex.value = 0
    showEmojiAutocomplete.value = false
    return
  }

  // Check for emoji autocomplete (:text)
  const emojiMatch = text.match(/:([a-z_]{0,})$/i)
  if (emojiMatch) {
    const query = emojiMatch[1] ?? ''
    if (query.length >= 3) {
      emojiQuery.value = query
      showEmojiAutocomplete.value = true
      emojiIndex.value = 0
      showMentionPopup.value = false // Hide mentions
      return
    }
  }

  // Check for user/label mention (@text)
  const userMatch = text.match(/@(\w*)$/)
  if (userMatch) {
    mentionQuery.value = userMatch[1] ?? ''
    mentionType.value = 'user'
    showMentionPopup.value = true
    mentionIndex.value = 0
    showEmojiAutocomplete.value = false // Hide emojis
  } else {
    showMentionPopup.value = false
    showEmojiAutocomplete.value = false
  }
}

function selectMention(name: string) {
  const ta = textareaRef.value
  if (!ta) return
  const pos = ta.selectionStart
  const text = content.value.substring(0, pos)

  let triggerChar = '@'
  let triggerIndex = text.lastIndexOf('@')

  if (mentionType.value === 'channel') {
    triggerChar = '#'
    triggerIndex = text.lastIndexOf('#')
  }

  if (triggerIndex === -1) return

  const before = content.value.substring(0, triggerIndex)
  const after = content.value.substring(pos)
  content.value = before + triggerChar + name + ' ' + after
  showMentionPopup.value = false

  const newPos = triggerIndex + name.length + 2
  nextTick(() => {
    ta.selectionStart = newPos
    ta.selectionEnd = newPos
    ta.focus()
  })
}

function selectEmoji(shortcode: string) {
  const ta = textareaRef.value
  if (!ta) return
  const pos = ta.selectionStart
  const text = content.value.substring(0, pos)
  const colonIndex = text.lastIndexOf(':')
  if (colonIndex === -1) return

  const emoji = shortcodeToEmoji.get(shortcode)
  if (!emoji) return

  const before = content.value.substring(0, colonIndex)
  const after = content.value.substring(pos)
  content.value = before + emoji + ' ' + after
  showEmojiAutocomplete.value = false

  const newPos = colonIndex + emoji.length + 1
  nextTick(() => {
    ta.selectionStart = newPos
    ta.selectionEnd = newPos
    ta.focus()
  })
}

async function handleSubmit() {
  if (!wsConnected.value) return

  const text = content.value.trim()
  const files = [...pendingFiles.value]

  if (!text && files.length === 0) return
  if (isSending.value) return

  // Clear input immediately to prevent double-submit
  content.value = ''
  pendingFiles.value = []

  // Clear draft after successful send
  draftsStore.clearDraft(props.channelId)

  if (files.length === 0) {
    // Fast path: no attachments, use WebSocket
    messagesStore.sendMessage({ content: text, channelId: props.channelId })
    return
  }

  // Upload files then send via HTTP
  isSending.value = true
  try {
    const attachments = await Promise.all(
      files.map((f) => uploadFile(f))
    )
    await messagesStore.sendMessageWithAttachments(
      props.channelId,
      text || ' ',
      attachments,
    )
  } finally {
    isSending.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  // Emoji autocomplete handling
  if (showEmojiAutocomplete.value && emojiResults.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      emojiIndex.value = (emojiIndex.value + 1) % emojiResults.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      emojiIndex.value = (emojiIndex.value - 1 + emojiResults.value.length) % emojiResults.value.length
      return
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      const result = emojiResults.value[emojiIndex.value]
      if (result && result.shortcodes[0]) selectEmoji(result.shortcodes[0])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      showEmojiAutocomplete.value = false
      return
    }
  }

  // Mention autocomplete handling
  if (showMentionPopup.value && mentionResults.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % mentionResults.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value - 1 + mentionResults.value.length) % mentionResults.value.length
      return
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      const result = mentionResults.value[mentionIndex.value]
      if (result) selectMention(result.name)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      showMentionPopup.value = false
      return
    }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) {
    addFiles(files)
  }
}

// Expose textarea ref for emoji picker insertion
function insertAtCursor(text: string) {
  const ta = textareaRef.value
  if (!ta) {
    content.value += text
    return
  }
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = content.value.substring(0, start)
  const after = content.value.substring(end)
  content.value = before + text + after
  // Restore cursor position after the inserted text
  const newPos = start + text.length
  requestAnimationFrame(() => {
    ta.selectionStart = newPos
    ta.selectionEnd = newPos
    ta.focus()
  })
}

function handleEmojiSelect(emoji: string) {
  insertAtCursor(emoji)
  showEmojiPicker.value = false
}

defineExpose({ insertAtCursor })
</script>

<template>
  <div
    class="relative"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <!-- Emoji autocomplete popup -->
    <div
      v-if="showEmojiAutocomplete && emojiResults.length > 0"
      class="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg"
    >
      <button
        v-for="(result, i) in emojiResults"
        :key="result.shortcodes[0] || result.emoji"
        @mousedown.prevent="result.shortcodes[0] && selectEmoji(result.shortcodes[0])"
        :class="[
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          i === emojiIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
        ]"
      >
        <span class="text-2xl">{{ result.emoji }}</span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">:{{ result.shortcodes[0] }}:</div>
          <div class="truncate text-xs text-muted-foreground">{{ result.keywords.join(', ') || result.category }}</div>
        </div>
      </button>
    </div>

    <!-- @Mention autocomplete popup -->
    <div
      v-if="showMentionPopup && mentionResults.length > 0"
      class="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg"
    >
      <button
        v-for="(result, i) in mentionResults"
        :key="result.id"
        @mousedown.prevent="selectMention(result.name)"
        :class="[
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          i === mentionIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
        ]"
      >
        <!-- User avatar -->
        <template v-if="result.type === 'user'">
          <img
            v-if="result.avatar"
            :src="result.avatar"
            class="h-6 w-6 rounded-full object-cover"
          />
          <div v-else class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {{ result.displayName.charAt(0) }}
          </div>
        </template>

        <!-- Label icon -->
        <div
          v-else-if="result.type === 'label'"
          class="flex h-6 w-6 items-center justify-center rounded-full"
          :style="{ backgroundColor: result.color || '#99aab5' }"
        >
          <span class="text-xs font-medium text-white">#</span>
        </div>

        <!-- Channel icon -->
        <div
          v-else-if="result.type === 'channel'"
          class="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary"
        >
          <Hash class="h-4 w-4" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{{ result.displayName }}</div>
          <div class="truncate text-xs text-muted-foreground">
            <template v-if="result.type === 'user'">@{{ result.name }}</template>
            <template v-else-if="result.type === 'label'">@{{ result.name }} <span class="opacity-60">(label)</span></template>
            <template v-else-if="result.type === 'channel'">#{{ result.name }}</template>
          </div>
        </div>
      </button>
    </div>

    <!-- File previews -->
    <div v-if="pendingFiles.length > 0" class="mb-1 flex flex-wrap gap-2 px-1">
      <FilePreview
        v-for="(file, i) in pendingFiles"
        :key="i"
        :file="file"
        @remove="removeFile(i)"
      />
    </div>

    <!-- Reply banner -->
    <div
      v-if="replyingTo"
      class="flex items-center gap-2 rounded-t-xl border border-b-0 border-input bg-secondary/50 px-3 py-1.5"
    >
      <CornerDownRight class="h-3.5 w-3.5 shrink-0 text-primary" />
      <span class="text-xs text-muted-foreground">
        {{ t('chat.replyTo', { user: replyingTo.author.displayName }) }}
      </span>
      <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{{ replyingTo.content }}</span>
      <button class="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground" @click="messagesStore.clearReply(channelId)">
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <div :class="['flex items-end border border-input bg-card', replyingTo ? 'rounded-b-xl rounded-t-none border-t-0' : 'rounded-xl']">
      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Paperclip button -->
      <Button
        variant="ghost"
        size="icon"
        class="mb-1 ml-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        :disabled="!wsConnected || !canWrite"
        @click="openFilePicker"
      >
        <Paperclip class="h-4 w-4" />
      </Button>

      <textarea
        ref="textareaRef"
        v-model="content"
        @keydown="handleKeydown"
        @input="emitTyping(); checkForMention()"
        @paste="handlePaste"
        :placeholder="!canWrite ? t('chat.noWritePermission') : (wsConnected ? t('chat.messagePlaceholder', { channel: channelName }) : t('chat.reconnecting'))"
        :disabled="!wsConnected || !canWrite"
        rows="1"
        class="max-h-[50vh] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />

      <!-- Emoji picker -->
      <Popover v-model:open="showEmojiPicker">
        <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="mb-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            :disabled="!wsConnected || !canWrite"
          >
            <Smile class="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" class="w-auto border-0 bg-transparent p-0 shadow-none">
          <EmojiPicker @select="handleEmojiSelect" />
        </PopoverContent>
      </Popover>

      <Button
        v-if="content.trim() || pendingFiles.length > 0"
        variant="ghost"
        size="icon"
        class="mb-1 mr-1 h-8 w-8 text-primary hover:text-primary"
        :disabled="isSending || !wsConnected || !canWrite"
        @click="handleSubmit"
      >
        <Loader2 v-if="isSending" class="h-4 w-4 animate-spin" />
        <SendHorizontal v-else class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
