<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Message } from '@/types'
import { messageApi } from '@/services/messageApi'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Search, X, File, Image, Link } from 'lucide-vue-next'
import { renderMarkdown } from '@/composables/useMarkdown'

interface Props {
  channelId: string
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  jumpTo: [messageId: string]
}>()

const query = ref('')
const results = ref<Message[]>([])
const total = ref(0)
const isSearching = ref(false)
const hasSearched = ref(false)
const activeFilter = ref<string | null>(null)

const filterOptions = [
  { key: 'file', label: 'File', icon: File },
  { key: 'image', label: 'Image', icon: Image },
  { key: 'link', label: 'Link', icon: Link },
]

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (q.trim().length < 2) {
    results.value = []
    hasSearched.value = false
    return
  }
  searchTimeout = setTimeout(() => doSearch(), 400)
})

watch(activeFilter, () => {
  if (query.value.trim().length >= 2) doSearch()
})

watch(() => props.open, (open) => {
  if (!open) {
    query.value = ''
    results.value = []
    hasSearched.value = false
    activeFilter.value = null
  }
})

async function doSearch() {
  const q = query.value.trim()
  if (q.length < 2) return

  isSearching.value = true
  hasSearched.value = true
  try {
    const params: Parameters<typeof messageApi.searchMessages>[1] = { q }
    if (activeFilter.value) params.has = activeFilter.value
    const { data } = await messageApi.searchMessages(props.channelId, params)
    results.value = data.messages
    total.value = data.total
  } catch {
    results.value = []
    total.value = 0
  } finally {
    isSearching.value = false
  }
}

function toggleFilter(key: string) {
  activeFilter.value = activeFilter.value === key ? null : key
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleJump(messageId: string) {
  emit('update:open', false)
  emit('jumpTo', messageId)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Search Messages</DialogTitle>
      </DialogHeader>

      <div class="space-y-3">
        <!-- Search input -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="query"
            placeholder="Search messages..."
            class="pl-10"
            autofocus
          />
        </div>

        <!-- Filter chips -->
        <div class="flex gap-2">
          <button
            v-for="f in filterOptions"
            :key="f.key"
            @click="toggleFilter(f.key)"
            :class="[
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors',
              activeFilter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            ]"
          >
            <component :is="f.icon" class="h-3 w-3" />
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- Results -->
      <ScrollArea class="flex-1 min-h-0 mt-3">
        <div class="space-y-2 pr-2">
          <div v-if="isSearching" class="flex items-center justify-center py-8">
            <span class="text-sm text-muted-foreground">Searching...</span>
          </div>

          <div v-else-if="hasSearched && results.length === 0" class="flex flex-col items-center justify-center py-8">
            <Search class="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p class="text-sm text-muted-foreground">No results found</p>
          </div>

          <template v-else>
            <div v-if="hasSearched && total > 0" class="mb-2 text-xs text-muted-foreground">
              {{ total }} result{{ total !== 1 ? 's' : '' }}
            </div>

            <button
              v-for="msg in results"
              :key="msg.id"
              @click="handleJump(msg.id)"
              class="w-full rounded-lg border border-border/50 bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
            >
              <div class="flex items-start gap-2">
                <UserAvatar
                  :src="msg.author.avatar"
                  :alt="msg.author.displayName"
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-xs font-medium text-foreground">{{ msg.author.displayName }}</span>
                    <span class="text-[10px] text-muted-foreground">{{ formatDate(msg.timestamp) }}</span>
                  </div>
                  <div class="mt-0.5 text-xs text-foreground/80 line-clamp-3 message-content" v-html="renderMarkdown(msg.content)" />
                </div>
              </div>
            </button>
          </template>
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
