<script setup lang="ts">
defineProps<{
  url: string
  filename: string
}>()
</script>

<template>
  <a :href="url" target="_blank" rel="noopener noreferrer">
    <img
      :src="url"
      :alt="filename"
      class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain"
    />
  </a>
</template>
