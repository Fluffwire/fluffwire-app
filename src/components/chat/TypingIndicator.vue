<script setup lang="ts">
import { computed } from 'vue'
import { useTypingStore } from '@/stores/typing'

interface Props {
  channelId: string
}

const props = defineProps<Props>()
const typingStore = useTypingStore()

const typingText = computed(() => typingStore.getTypingText(props.channelId))
</script>

<template>
  <div class="absolute bottom-0 left-4 h-6 text-xs text-muted-foreground">
    <span v-if="typingText">{{ typingText }}</span>
  </div>
</template>
