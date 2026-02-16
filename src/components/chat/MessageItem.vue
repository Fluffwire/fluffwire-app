<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { Message } from '@/types'
import type { Tier } from '@/constants/tiers'
import { canBypassChannelRestrictions } from '@/constants/tiers'
import { useChannelsStore } from '@/stores/channels'
import { useMembersStore } from '@/stores/members'
import { useLabelsStore } from '@/stores/labels'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/common/UserAvatar.vue'
import UserProfilePopover from '@/components/common/UserProfilePopover.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { renderMarkdown } from '@/composables/useMarkdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import EmojiPicker from './EmojiPicker.vue'
import ImageAttachment from './ImageAttachment.vue'
import ImageLightbox from './ImageLightbox.vue'
import { toast } from 'vue-sonner'
import { Pencil, Trash2, Pin, SmilePlus, CornerDownRight, Copy, Link, Hash, Eye } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const channelsStore = useChannelsStore()
const membersStore = useMembersStore()
const labelsStore = useLabelsStore()
const authStore = useAuthStore()

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

const { t } = useI18n()

const emit = defineEmits<{
  edit: [messageId: string, content: string]
  delete: [messageId: string]
  pin: [messageId: string]
  unpin: [messageId: string]
  reaction: [messageId: string, emoji: string]
  reply: [message: Message]
  jumpTo: [messageId: string]
  markUnread: [messageId: string]
}>()

const isEditing = ref(false)
const editContent = ref('')
const editTextarea = ref<HTMLTextAreaElement | null>(null)
const showDeleteDialog = ref(false)
const showReactionPicker = ref(false)
const keepActionBarVisible = ref(false)
const showFullEmojiPicker = ref(false)

// Image lightbox state
const showImageLightbox = ref(false)
const lightboxImages = ref<{ url: string; filename: string }[]>([])
const lightboxInitialIndex = ref(0)

// Quick reaction emojis
const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉']

function handleReactionSelect(emoji: string) {
  emit('reaction', props.message.id, emoji)
  showReactionPicker.value = false
}

// Watch for reaction picker opening/closing and manage action bar visibility
watch(showReactionPicker, (isOpen) => {
  if (isOpen) {
    keepActionBarVisible.value = true
  } else {
    // Delay hiding to prevent flicker during popover close animation
    setTimeout(() => {
      keepActionBarVisible.value = false
      showFullEmojiPicker.value = false // Reset to quick reactions
    }, 200)
  }
})

const isOwnMessage = computed(() => props.currentUserId === props.message.author.id)

// Check if user has write access to the channel
const canWrite = computed(() => {
  const serverId = route.params.serverId as string
  if (!serverId || serverId === '@me') return true // DMs always allow write

  const channel = channelsStore.channels.find(c => c.id === props.message.channelId)
  if (!channel) return true // Unknown channel, allow by default

  const member = membersStore.getMembers(serverId).find(m => m.userId === authStore.user?.id)
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
      const allowedUserIds = channel.allowedUserIds || []
      const allowedLabelIds = channel.allowedLabelIds || []
      return allowedUserIds.includes(member.userId) || userLabelIds.some(id => allowedLabelIds.includes(id))
    case 'restricted_write':
      const allowedWriteUsers = channel.allowedUserIds || []
      const allowedWriteLabels = channel.allowedLabelIds || []
      return allowedWriteUsers.includes(member.userId) || userLabelIds.some(id => allowedWriteLabels.includes(id))
    default:
      return true
  }
})

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

// Build list of valid mentions (usernames + label names) for this server
const validMentions = computed(() => {
  const serverId = route.params.serverId as string
  if (!serverId || serverId === '@me') return undefined // DMs don't need validation

  const mentions: string[] = []

  // Add all member usernames (lowercase for case-insensitive matching)
  const members = membersStore.getMembers(serverId)
  members.forEach(m => {
    mentions.push(m.user.username.toLowerCase())
  })

  // Add all label names (lowercase)
  const labels = labelsStore.getLabels(serverId)
  labels.forEach(l => {
    mentions.push(l.name.toLowerCase())
  })

  return mentions
})

// Build list of valid channel names for this server
const validChannels = computed(() => {
  const serverId = route.params.serverId as string
  if (!serverId || serverId === '@me') return undefined // DMs don't have channels

  const channels: string[] = []
  channelsStore.textChannels.forEach(c => {
    channels.push(c.name.toLowerCase())
  })

  return channels
})

const renderedContent = computed(() => renderMarkdown(props.message.content, validMentions.value, validChannels.value))

const youtubeVideoId = computed(() => {
  const match = props.message.content.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/
  )
  return match ? match[1] : null
})

const youtubePlaying = ref(false)

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

// Handle image click to open lightbox
function openImageLightbox(url: string, filename: string) {
  lightboxImages.value = imageAttachments.value.map(att => ({
    url: att.url,
    filename: att.filename
  }))
  lightboxInitialIndex.value = imageAttachments.value.findIndex(att => att.url === url)
  showImageLightbox.value = true
}

function resizeEditTextarea(event: Event) {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function startEditing() {
  editContent.value = props.message.content
  isEditing.value = true
  nextTick(() => {
    if (editTextarea.value) {
      editTextarea.value.focus()
      editTextarea.value.selectionStart = editTextarea.value.value.length
      editTextarea.value.style.height = 'auto'
      editTextarea.value.style.height = editTextarea.value.scrollHeight + 'px'
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

function copyText() {
  navigator.clipboard.writeText(props.message.content)
  toast.success(t('chat.copiedText'))
}

function copyMessageLink() {
  navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?msg=' + props.message.id)
  toast.success(t('chat.copiedLink'))
}

function copyMessageId() {
  navigator.clipboard.writeText(props.message.id)
  toast.success(t('chat.copiedId'))
}

// Handle clicks on mentions and channels in message content
function handleMessageClick(event: MouseEvent) {
  const target = event.target as HTMLElement

  // Handle channel mention clicks (#channelname)
  if (target.classList.contains('channel-mention')) {
    event.preventDefault()
    const channelName = target.textContent?.replace('#', '').toLowerCase()
    if (!channelName) return

    // Find the channel by name
    const channel = channelsStore.textChannels.find(c => c.name.toLowerCase() === channelName)
    if (channel) {
      const serverId = route.params.serverId as string
      router.push({ name: 'channel', params: { serverId, channelId: channel.id } })
    } else {
      toast.error(t('chat.channelNotFound'))
    }
  }

  // Handle user mention clicks (@username)
  if (target.classList.contains('mention')) {
    event.preventDefault()
    const mentionText = target.textContent?.replace('@', '').toLowerCase()
    if (!mentionText) return

    const serverId = route.params.serverId as string
    if (!serverId || serverId === '@me') return

    // Try to find the user by username
    const members = membersStore.getMembers(serverId)
    const member = members.find(m => m.user.username.toLowerCase() === mentionText)

    if (member) {
      // Open user profile (we'll trigger the same popover behavior)
      // For now, show a toast - we'd need to implement a proper dialog
      // TODO: Implement user profile dialog/modal
      toast.info(t('chat.userMentionClicked', { username: member.user.displayName }))
    }
  }
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        :data-message-id="message.id"
        :class="[
          'group relative flex gap-4 px-4 py-0.5 transition-colors hover:bg-accent/30 rounded-lg mx-2',
          showAuthor ? 'mt-4' : '',
        ]"
      >
    <TooltipProvider>
    <!-- Hover action buttons -->
    <div
      v-if="!isEditing"
      :class="[
        'absolute -top-3 right-4 z-10 gap-0.5 rounded-md border border-border/50 bg-card p-0.5 shadow-sm',
        keepActionBarVisible ? 'flex' : 'hidden group-hover:flex'
      ]"
    >
      <Tooltip v-if="canWrite">
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" class="h-7 w-7" @click="emit('reply', message)">
            <CornerDownRight class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t('chat.reply') }}</TooltipContent>
      </Tooltip>
      <Popover v-if="canWrite" v-model:open="showReactionPicker">
        <PopoverTrigger as-child>
          <Button variant="ghost" size="icon" class="h-7 w-7">
            <SmilePlus class="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" class="w-auto p-2">
          <!-- Quick reactions -->
          <div v-if="!showFullEmojiPicker" class="flex items-center gap-1">
            <button
              v-for="emoji in quickEmojis"
              :key="emoji"
              @click="handleReactionSelect(emoji)"
              class="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-lg transition-colors"
            >
              {{ emoji }}
            </button>
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="showFullEmojiPicker = true">
              <SmilePlus class="h-4 w-4" />
            </Button>
          </div>
          <!-- Full emoji picker -->
          <EmojiPicker v-else @select="handleReactionSelect" />
        </PopoverContent>
      </Popover>
      <Tooltip v-if="isOwnMessage || canDelete">
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            @click="message.pinned ? emit('unpin', message.id) : emit('pin', message.id)"
          >
            <Pin class="h-3.5 w-3.5" :class="message.pinned ? 'text-primary' : ''" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ message.pinned ? $t('chat.unpinMessage') : $t('chat.pinMessage') }}</TooltipContent>
      </Tooltip>
      <Tooltip v-if="isOwnMessage">
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" class="h-7 w-7" @click="startEditing">
            <Pencil class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t('common.edit') }}</TooltipContent>
      </Tooltip>
      <Tooltip v-if="isOwnMessage || canDelete">
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" @click="showDeleteDialog = true">
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t('common.delete') }}</TooltipContent>
      </Tooltip>
    </div>

      <template v-if="showAuthor">
        <UserProfilePopover :user="message.author" side="right">
          <div class="mt-0.5 shrink-0 cursor-pointer">
            <UserAvatar
              :src="message.author.avatar"
              :alt="message.author.displayName"
              size="md"
            />
          </div>
        </UserProfilePopover>
        <div class="min-w-0 flex-1">
          <!-- Reply preview -->
          <button
            v-if="message.replyTo"
            class="mb-1 flex items-center gap-1.5 rounded border-l-2 border-primary bg-secondary/30 px-2 py-1 text-xs hover:bg-secondary/50 transition-colors"
            @click="emit('jumpTo', message.replyTo!.id)"
          >
            <CornerDownRight class="h-3 w-3 shrink-0 text-muted-foreground" />
            <span class="font-semibold text-foreground">{{ message.replyTo.author.displayName }}</span>
            <span class="truncate text-muted-foreground">{{ message.replyTo.content }}</span>
          </button>
          <div class="flex items-baseline gap-2">
            <UserProfilePopover :user="message.author" side="right">
              <span class="text-sm font-medium text-foreground hover:text-primary cursor-pointer">
                {{ message.author.displayName }}
              </span>
            </UserProfilePopover>
            <span v-if="message.webhookId" class="rounded bg-primary/20 px-1 py-0.5 text-[10px] font-semibold uppercase leading-none text-primary">BOT</span>
            <Tooltip>
              <TooltipTrigger as-child>
                <span class="text-xs text-muted-foreground">{{ formattedTime }}</span>
              </TooltipTrigger>
              <TooltipContent>{{ formattedTime }}</TooltipContent>
            </Tooltip>
            <span v-if="message.editedAt" class="text-xs text-muted-foreground">{{ $t('chat.edited') }}</span>
          </div>

          <!-- Inline edit mode -->
          <div v-if="isEditing" class="mt-1">
            <textarea
              ref="editTextarea"
              v-model="editContent"
              @keydown="handleEditKeydown"
              @input="resizeEditTextarea"
              class="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary max-h-[50vh] overflow-y-auto"
              rows="1"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              Press <kbd class="rounded border border-border px-1">Enter</kbd> to save,
              <kbd class="rounded border border-border px-1">Escape</kbd> to cancel
            </p>
          </div>

          <!-- Normal content -->
          <template v-else>
            <div class="message-content text-sm text-foreground/90 break-words" v-html="renderedContent" @click="handleMessageClick" />
            <div v-if="youtubeVideoId" class="mt-2 max-w-[400px] overflow-hidden rounded-lg border border-border/50">
              <iframe
                v-if="youtubePlaying"
                :src="`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1`"
                class="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
              <button v-else class="relative aspect-video w-full" @click="youtubePlaying = true">
                <img
                  :src="`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`"
                  :alt="'YouTube video'"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30">
                  <div class="flex h-12 w-16 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg">
                    <svg class="h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </button>
            </div>

            <!-- Image attachments -->
            <div v-if="imageAttachments.length" class="mt-1 flex flex-wrap gap-2">
              <ImageAttachment
                v-for="att in imageAttachments"
                :key="att.id"
                :url="att.url"
                :filename="att.filename"
                @click="openImageLightbox"
              />
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

            <!-- Reactions -->
            <div v-if="message.reactions?.length" class="mt-1 flex flex-wrap gap-1">
              <button
                v-for="r in message.reactions"
                :key="r.emoji"
                @click="emit('reaction', message.id, r.emoji)"
                :class="[
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                  r.userIds.includes(currentUserId ?? '')
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary',
                ]"
              >
                <span>{{ r.emoji }}</span>
                <span>{{ r.count }}</span>
              </button>
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
          <!-- Reply preview -->
          <button
            v-if="message.replyTo"
            class="mb-1 flex items-center gap-1.5 rounded border-l-2 border-primary bg-secondary/30 px-2 py-1 text-xs hover:bg-secondary/50 transition-colors"
            @click="emit('jumpTo', message.replyTo!.id)"
          >
            <CornerDownRight class="h-3 w-3 shrink-0 text-muted-foreground" />
            <span class="font-semibold text-foreground">{{ message.replyTo.author.displayName }}</span>
            <span class="truncate text-muted-foreground">{{ message.replyTo.content }}</span>
          </button>
          <!-- Inline edit mode -->
          <div v-if="isEditing">
            <textarea
              ref="editTextarea"
              v-model="editContent"
              @keydown="handleEditKeydown"
              @input="resizeEditTextarea"
              class="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary max-h-[50vh] overflow-y-auto"
              rows="1"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              Press <kbd class="rounded border border-border px-1">Enter</kbd> to save,
              <kbd class="rounded border border-border px-1">Escape</kbd> to cancel
            </p>
          </div>

          <!-- Normal content -->
          <template v-else>
            <div class="message-content text-sm text-foreground/90 break-words" v-html="renderedContent" @click="handleMessageClick" />
            <div v-if="youtubeVideoId" class="mt-2 max-w-[400px] overflow-hidden rounded-lg border border-border/50">
              <iframe
                v-if="youtubePlaying"
                :src="`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1`"
                class="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
              <button v-else class="relative aspect-video w-full" @click="youtubePlaying = true">
                <img
                  :src="`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`"
                  :alt="'YouTube video'"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30">
                  <div class="flex h-12 w-16 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg">
                    <svg class="h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </button>
            </div>

            <!-- Image attachments -->
            <div v-if="imageAttachments.length" class="mt-1 flex flex-wrap gap-2">
              <ImageAttachment
                v-for="att in imageAttachments"
                :key="att.id"
                :url="att.url"
                :filename="att.filename"
                @click="openImageLightbox"
              />
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

            <!-- Reactions -->
            <div v-if="message.reactions?.length" class="mt-1 flex flex-wrap gap-1">
              <button
                v-for="r in message.reactions"
                :key="r.emoji"
                @click="emit('reaction', message.id, r.emoji)"
                :class="[
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                  r.userIds.includes(currentUserId ?? '')
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary',
                ]"
              >
                <span>{{ r.emoji }}</span>
                <span>{{ r.count }}</span>
              </button>
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
    </ContextMenuTrigger>
    <ContextMenuContent class="w-56">
      <ContextMenuItem v-if="canWrite" class="gap-2" @select="emit('reply', message)">
        <CornerDownRight class="h-4 w-4" /> {{ $t('chat.reply') }}
      </ContextMenuItem>
      <ContextMenuItem v-if="canWrite" class="gap-2" @select="showReactionPicker = true">
        <SmilePlus class="h-4 w-4" /> {{ $t('chat.addReaction') }}
      </ContextMenuItem>
      <ContextMenuSeparator v-if="canWrite" />
      <ContextMenuItem v-if="isOwnMessage && canWrite" class="gap-2" @select="startEditing()">
        <Pencil class="h-4 w-4" /> {{ $t('chat.editMessage') }}
      </ContextMenuItem>
      <ContextMenuItem v-if="isOwnMessage || canDelete" class="gap-2" @select="message.pinned ? emit('unpin', message.id) : emit('pin', message.id)">
        <Pin class="h-4 w-4" /> {{ message.pinned ? $t('chat.unpinMessage') : $t('chat.pinMessage') }}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem class="gap-2" @select="emit('markUnread', message.id)">
        <Eye class="h-4 w-4" /> Mark as Unread
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @select="copyText()">
        <Copy class="h-4 w-4" /> {{ $t('chat.copyText') }}
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @select="copyMessageLink()">
        <Link class="h-4 w-4" /> {{ $t('chat.copyLink') }}
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @select="copyMessageId()">
        <Hash class="h-4 w-4" /> {{ $t('chat.copyId') }}
      </ContextMenuItem>
      <template v-if="(isOwnMessage && canWrite) || canDelete">
        <ContextMenuSeparator />
        <ContextMenuItem class="gap-2 text-destructive focus:text-destructive" @select="showDeleteDialog = true">
          <Trash2 class="h-4 w-4" /> {{ $t('chat.deleteMessage') }}
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>

  <!-- Image Lightbox -->
  <ImageLightbox
    v-model:open="showImageLightbox"
    :images="lightboxImages"
    :initial-index="lightboxInitialIndex"
  />
</template>
