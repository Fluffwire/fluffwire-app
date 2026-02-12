<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  size: 'md',
})

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}
</script>

<template>
  <div class="flex items-center justify-center">
    <Loader2 :class="['animate-spin text-primary', sizeClasses[size]]" />
  </div>
</template>
