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
        'absolute left-0 w-1 rounded-r-full bg-text-primary transition-all duration-200',
        active ? 'h-10' : 'h-0 group-hover:h-5',
      ]"
    />
    <button
      @click="$emit('click')"
      :class="[
        'group flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200',
        active
          ? 'rounded-[16px]'
          : 'rounded-[24px] hover:rounded-[16px]',
        server.icon ? '' : 'bg-chat-bg text-text-primary hover:bg-blurple hover:text-white',
        active && !server.icon ? 'bg-blurple text-white' : '',
      ]"
      :title="server.name"
    >
      <img
        v-if="server.icon"
        :src="server.icon"
        :alt="server.name"
        class="h-full w-full object-cover"
      />
      <span v-else class="text-sm font-semibold">
        {{ getInitials(server.name) }}
      </span>
    </button>
  </div>
</template>
