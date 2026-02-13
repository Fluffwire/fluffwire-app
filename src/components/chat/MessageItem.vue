<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { Message } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { renderMarkdown } from '@/composables/useMarkdown'
import { Pencil, Trash2 } from 'lucide-vue-next'

interface Props {
  message: Message
  showAuthor?: boolean
  currentUserId?: string
  canDelete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAuthor: true,
  canDelete: false,
})

const emit = defineEmits<{
  edit: [messageId: string, content: string]
  delete: [messageId: string]
}>()

const isEditing = ref(false)
const editContent = ref('')
const editTextarea = ref<HTMLTextAreaElement | null>(null)
const showDeleteDialog = ref(false)

const isOwnMessage = computed(() => props.currentUserId === props.message.author.id)

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  if (isToday) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }) +
    ` ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

const shortTime = computed(() => {
  return new Date(props.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const renderedContent = computed(() => renderMarkdown(props.message.content))

const imageAttachments = computed(() =>
  (props.message.attachments ?? []).filter((a) => a.contentType.startsWith('image/'))
)

const fileAttachments = computed(() =>
  (props.message.attachments ?? []).filter((a) => !a.contentType.startsWith('image/'))
)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function startEditing() {
  editContent.value = props.message.content
  isEditing.value = true
  nextTick(() => {
    if (editTextarea.value) {
      editTextarea.value.focus()
      editTextarea.value.selectionStart = editTextarea.value.value.length
    }
  })
}

function cancelEditing() {
  isEditing.value = false
  editContent.value = ''
}

function saveEdit() {
  const trimmed = editContent.value.trim()
  if (!trimmed || trimmed === props.message.content) {
    cancelEditing()
    return
  }
  emit('edit', props.message.id, trimmed)
  isEditing.value = false
  editContent.value = ''
}

function handleEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancelEditing()
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    saveEdit()
  }
}

function confirmDelete() {
  emit('delete', props.message.id)
  showDeleteDialog.value = false
}
</script>

<template>
  <div
    :class="[
      'group relative flex gap-4 px-4 py-0.5 transition-colors hover:bg-accent/30 rounded-lg mx-2',
      showAuthor ? 'mt-4' : '',
    ]"
  >
    <!-- Hover action buttons -->
    <div
      v-if="(isOwnMessage || canDelete) && !isEditing"
      class="absolute -top-3 right-4 z-10 hidden gap-0.5 rounded-md border border-border/50 bg-card p-0.5 shadow-sm group-hover:flex"
    >
      <Tooltip v-if="isOwnMessage">
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" class="h-7 w-7" @click="startEditing">
            <Pencil class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Tooltip v-if="isOwnMessage || canDelete">
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" @click="showDeleteDialog = true">
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>

    <TooltipProvider>
      <template v-if="showAuthor">
        <div class="mt-0.5 shrink-0">
          <UserAvatar
            :src="message.author.avatar"
            :alt="message.author.displayName"
            size="md"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-foreground hover:text-primary cursor-pointer">
              {{ message.author.displayName }}
            </span>
            <Tooltip>
              <TooltipTrigger as-child>
                <span class="text-xs text-muted-foreground">{{ formattedTime }}</span>
              </TooltipTrigger>
              <TooltipContent>{{ formattedTime }}</TooltipContent>
            </Tooltip>
            <span v-if="message.editedAt" class="text-xs text-muted-foreground">(edited)</span>
          </div>

          <!-- Inline edit mode -->
          <div v-if="isEditing" class="mt-1">
            <textarea
              ref="editTextarea"
              v-model="editContent"
              @keydown="handleEditKeydown"
              class="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              rows="2"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              Press <kbd class="rounded border border-border px-1">Enter</kbd> to save,
              <kbd class="rounded border border-border px-1">Escape</kbd> to cancel
            </p>
          </div>

          <!-- Normal content -->
          <template v-else>
            <div class="message-content text-sm text-foreground/90 break-words" v-html="renderedContent" />

            <!-- Image attachments -->
            <div v-if="imageAttachments.length" class="mt-1 flex flex-col gap-1">
              <a
                v-for="att in imageAttachments"
                :key="att.id"
                :href="att.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  :src="att.url"
                  :alt="att.filename"
                  class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain"
                />
              </a>
            </div>

            <!-- File attachments -->
            <div v-if="fileAttachments.length" class="mt-1 flex flex-col gap-1">
              <a
                v-for="att in fileAttachments"
                :key="att.id"
                :href="att.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <span class="truncate">{{ att.filename }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{{ formatFileSize(att.size) }}</span>
              </a>
            </div>
          </template>
        </div>
      </template>

      <template v-else>
        <div class="w-10 shrink-0">
          <Tooltip>
            <TooltipTrigger as-child>
              <span class="invisible text-xs text-muted-foreground group-hover:visible">
                {{ shortTime }}
              </span>
            </TooltipTrigger>
            <TooltipContent>{{ formattedTime }}</TooltipContent>
          </Tooltip>
        </div>
        <div class="min-w-0 flex-1">
          <!-- Inline edit mode -->
          <div v-if="isEditing">
            <textarea
              ref="editTextarea"
              v-model="editContent"
              @keydown="handleEditKeydown"
              class="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              rows="2"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              Press <kbd class="rounded border border-border px-1">Enter</kbd> to save,
              <kbd class="rounded border border-border px-1">Escape</kbd> to cancel
            </p>
          </div>

          <!-- Normal content -->
          <template v-else>
            <div class="message-content text-sm text-foreground/90 break-words" v-html="renderedContent" />

            <!-- Image attachments -->
            <div v-if="imageAttachments.length" class="mt-1 flex flex-col gap-1">
              <a
                v-for="att in imageAttachments"
                :key="att.id"
                :href="att.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  :src="att.url"
                  :alt="att.filename"
                  class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain"
                />
              </a>
            </div>

            <!-- File attachments -->
            <div v-if="fileAttachments.length" class="mt-1 flex flex-col gap-1">
              <a
                v-for="att in fileAttachments"
                :key="att.id"
                :href="att.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <span class="truncate">{{ att.filename }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{{ formatFileSize(att.size) }}</span>
              </a>
            </div>
          </template>
        </div>
      </template>
    </TooltipProvider>

    <!-- Delete confirmation dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Message</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this message? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="confirmDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
