<script setup lang="ts">
import { computed } from 'vue'
import { X, FileText } from 'lucide-vue-next'

interface Props {
  file: File
}

const props = defineProps<Props>()
const emit = defineEmits<{ remove: [] }>()

const isImage = computed(() => props.file.type.startsWith('image/'))
const previewUrl = computed(() => isImage.value ? URL.createObjectURL(props.file) : '')

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="group relative inline-flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 p-2">
    <button
      @click="emit('remove')"
      class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
    >
      <X class="h-3 w-3" />
    </button>

    <template v-if="isImage">
      <img :src="previewUrl" :alt="file.name" class="h-16 w-16 rounded object-cover" />
    </template>
    <template v-else>
      <FileText class="h-8 w-8 text-muted-foreground" />
    </template>

    <div class="min-w-0">
      <div class="max-w-[150px] truncate text-xs font-medium text-foreground">{{ file.name }}</div>
      <div class="text-xs text-muted-foreground">{{ formatSize(file.size) }}</div>
    </div>
  </div>
</template>
