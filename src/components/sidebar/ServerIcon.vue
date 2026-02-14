<script setup lang="ts">
import type { Server } from '@/types'

interface Props {
  server: Server
  active: boolean
}

defineProps<Props>()
defineEmits<{ click: [] }>()

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <div class="relative flex items-center justify-center">
    <!-- Active pill indicator -->
    <div
      :class="[
        'absolute left-0 w-1 rounded-r-full bg-primary transition-all duration-200',
        active ? 'h-8' : 'h-0 group-hover:h-4',
      ]"
    />
    <button
      @click="$emit('click')"
      :class="[
        'group flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200',
        active
          ? 'rounded-2xl shadow-lg shadow-primary/25'
          : 'rounded-[28px] hover:rounded-2xl hover:shadow-md hover:shadow-primary/15',
        server.icon
          ? active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
          : active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground',
      ]"
    >
      <img
        v-if="server.icon"
        :src="server.icon"
        :alt="server.name"
        class="h-full w-full object-cover"
      />
      <span v-else class="text-xs font-semibold">
        {{ getInitials(server.name) }}
      </span>
    </button>
  </div>
</template>
