<script setup lang="ts">
const props = defineProps<{
  url: string
  filename: string
}>()

const emit = defineEmits<{
  (e: 'click', url: string, filename: string): void
}>()

function handleClick(e: MouseEvent) {
  e.preventDefault()
  emit('click', props.url, props.filename)
}
</script>

<template>
  <div @click="handleClick" class="cursor-pointer">
    <img
      :src="url"
      :alt="filename"
      class="max-h-[300px] max-w-[400px] rounded-lg border border-border/50 object-contain transition-opacity hover:opacity-80"
    />
  </div>
</template>
