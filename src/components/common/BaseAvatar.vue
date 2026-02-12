<script setup lang="ts">
import type { UserStatus } from '@/types'

interface Props {
  src: string | null
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  status?: UserStatus | null
}

withDefaults(defineProps<Props>(), {
  alt: '',
  size: 'md',
  status: null,
})

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-20 w-20',
}

const statusColors = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-offline',
}

const statusDotSize = {
  xs: 'h-2 w-2 -bottom-0.5 -right-0.5',
  sm: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
  md: 'h-3 w-3 -bottom-0.5 -right-0.5',
  lg: 'h-4 w-4 -bottom-1 -right-1',
}
</script>

<template>
  <div class="relative inline-flex shrink-0">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      :class="['rounded-full object-cover', sizeClasses[size]]"
    />
    <div
      v-else
      :class="[
        'flex items-center justify-center rounded-full bg-blurple text-white font-semibold',
        sizeClasses[size],
        size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-2xl' : 'text-sm',
      ]"
    >
      {{ alt?.charAt(0)?.toUpperCase() || '?' }}
    </div>
    <span
      v-if="status"
      :class="[
        'absolute rounded-full border-2 border-channel-bg',
        statusColors[status],
        statusDotSize[size],
      ]"
    />
  </div>
</template>
