<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { messageApi } from '@/services/messageApi'
import { uploadFile } from '@/services/api'
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
const messagesStore = useMessagesStore()

const replyingTo = computed(() => messagesStore.getReplyTo(props.channelId))

const content = ref('')
const pendingFiles = ref<File[]>([])
const isSending = ref(false)
const showEmojiPicker = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const lastTypingSent = ref(0)

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

async function handleSubmit() {
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
        Replying to <span class="font-semibold text-foreground">{{ replyingTo.author.displayName }}</span>
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
        @click="openFilePicker"
      >
        <Paperclip class="h-4 w-4" />
      </Button>

      <textarea
        ref="textareaRef"
        v-model="content"
        @keydown="handleKeydown"
        @input="emitTyping"
        @paste="handlePaste"
        :placeholder="`Message #${channelName}`"
        rows="1"
        class="max-h-[50vh] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none"
      />

      <!-- Emoji picker -->
      <Popover v-model:open="showEmojiPicker">
        <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="mb-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
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
        :disabled="isSending"
        @click="handleSubmit"
      >
        <Loader2 v-if="isSending" class="h-4 w-4 animate-spin" />
        <SendHorizontal v-else class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
