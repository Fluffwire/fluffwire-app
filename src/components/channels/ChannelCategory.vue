<script setup lang="ts">
import { ref } from 'vue'
import type { Channel, ChannelCategory as CategoryType } from '@/types'
import ChannelItem from './ChannelItem.vue'

interface Props {
  category: CategoryType
  channels: Channel[]
}

defineProps<Props>()

const isCollapsed = ref(false)
</script>

<template>
  <div class="mt-4">
    <button
      @click="isCollapsed = !isCollapsed"
      class="flex w-full items-center gap-0.5 px-1 text-xs font-semibold uppercase text-text-secondary transition-colors hover:text-text-primary"
    >
      <svg
        :class="['h-3 w-3 transition-transform', isCollapsed ? '-rotate-90' : '']"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>
      <span>{{ category.name }}</span>
    </button>

    <div v-show="!isCollapsed" class="mt-0.5">
      <ChannelItem
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
      />
    </div>
  </div>
</template>
