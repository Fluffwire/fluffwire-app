<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useMembersStore } from '@/stores/members'
import { messageApi } from '@/services/messageApi'
import { uploadFile } from '@/services/api'
import { wsService } from '@/services/websocket'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import FilePreview from './FilePreview.vue'
import EmojiPicker from './EmojiPicker.vue'
import { SendHorizontal, Paperclip, Smile, Loader2, CornerDownRight, X } from 'lucide-vue-next'

interface Props {
  channelId: string
  channelName: string
}

const props = defineProps<Props>()
const { t } = useI18n()
const route = useRoute()
const messagesStore = useMessagesStore()
const membersStore = useMembersStore()

const replyingTo = computed(() => messagesStore.getReplyTo(props.channelId))

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

const mentionResults = computed(() => {
  const serverId = route.params.serverId as string
  if (!serverId) return []
  const members = membersStore.getMembers(serverId)
  const query = mentionQuery.value.toLowerCase()
  return members
    .filter(m =>
      m.user.username.toLowerCase().includes(query) ||
      m.user.displayName.toLowerCase().includes(query)
    )
    .slice(0, 8)
})

const wsConnected = ref(wsService.isConnected)
const unsubConnection = wsService.addConnectionListener((connected) => {
  wsConnected.value = connected
})
onBeforeUnmount(() => unsubConnection())

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
  // Find the last @ that isn't preceded by a word character
  const match = text.match(/@(\w*)$/)
  if (match) {
    mentionQuery.value = match[1] ?? ''
    showMentionPopup.value = true
    mentionIndex.value = 0
  } else {
    showMentionPopup.value = false
  }
}

function selectMention(username: string) {
  const ta = textareaRef.value
  if (!ta) return
  const pos = ta.selectionStart
  const text = content.value.substring(0, pos)
  const atIndex = text.lastIndexOf('@')
  if (atIndex === -1) return
  const before = content.value.substring(0, atIndex)
  const after = content.value.substring(pos)
  content.value = before + '@' + username + ' ' + after
  showMentionPopup.value = false
  const newPos = atIndex + username.length + 2
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
    pendingFiles.value = []
  } finally {
    isSending.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
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
      const member = mentionResults.value[mentionIndex.value]
      if (member) selectMention(member.user.username)
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
    <!-- @Mention autocomplete popup -->
    <div
      v-if="showMentionPopup && mentionResults.length > 0"
      class="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg"
    >
      <button
        v-for="(member, i) in mentionResults"
        :key="member.user.id"
        @mousedown.prevent="selectMention(member.user.username)"
        :class="[
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          i === mentionIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
        ]"
      >
        <img
          v-if="member.user.avatar"
          :src="member.user.avatar"
          class="h-6 w-6 rounded-full object-cover"
        />
        <div v-else class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
          {{ member.user.displayName.charAt(0) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{{ member.user.displayName }}</div>
          <div class="truncate text-xs text-muted-foreground">@{{ member.user.username }}</div>
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
        :disabled="!wsConnected"
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
        :placeholder="wsConnected ? t('chat.messagePlaceholder', { channel: channelName }) : t('chat.reconnecting')"
        :disabled="!wsConnected"
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
            :disabled="!wsConnected"
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
        :disabled="isSending || !wsConnected"
        @click="handleSubmit"
      >
        <Loader2 v-if="isSending" class="h-4 w-4 animate-spin" />
        <SendHorizontal v-else class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
