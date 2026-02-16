<script setup lang="ts">
import type { UserStatus } from '@/types'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  src: string | null
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  status?: UserStatus | null
}

const props = withDefaults(defineProps<Props>(), {
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

const fallbackTextSize = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl',
}
</script>

<template>
  <div class="relative inline-flex shrink-0">
    <Avatar :class="sizeClasses[size]">
      <AvatarImage v-if="src" :key="src" :src="src" :alt="alt" />
      <AvatarFallback :class="['bg-primary text-primary-foreground font-semibold', fallbackTextSize[size]]">
        {{ alt?.charAt(0)?.toUpperCase() || '?' }}
      </AvatarFallback>
    </Avatar>
    <span
      v-if="status"
      :class="[
        'absolute rounded-full border-2 border-card',
        statusColors[status],
        statusDotSize[size],
      ]"
    />
  </div>
</template>
