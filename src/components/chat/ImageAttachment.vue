<script setup lang="ts">
import { useImageUrl } from '@/composables/useImageUrl'
import { toRef } from 'vue'

const props = defineProps<{
  url: string
  filename: string
}>()

const blobUrl = useImageUrl(toRef(() => props.url))
</script>

<template>
  <a :href="url" target="_blank" rel="noopener noreferrer">
    <img
      v-if="blobUrl"
      :src="blobUrl"
      :alt="filename"
      class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain"
    />
    <div v-else class="flex h-[100px] w-[200px] items-center justify-center rounded-lg border border-border/50 bg-secondary/50 text-sm text-muted-foreground">
      Loading...
    </div>
  </a>
</template>
