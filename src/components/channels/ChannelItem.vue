<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Channel } from '@/types'
import { useVoiceStore } from '@/stores/voice'

interface Props {
  channel: Channel
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const voiceStore = useVoiceStore()

const isActive = computed(() => route.params.channelId === props.channel.id)

function handleClick() {
  if (props.channel.type === 'voice') {
    voiceStore.joinChannel(props.channel.serverId, props.channel.id)
  } else {
    router.push(`/channels/${props.channel.serverId}/${props.channel.id}`)
  }
}
</script>

<template>
  <button
    @click="handleClick"
    :class="[
      'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors',
      isActive
        ? 'bg-active-bg text-text-primary'
        : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary',
    ]"
  >
    <svg v-if="channel.type === 'text'" class="h-5 w-5 shrink-0 opacity-60" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5.88 21l1.54-6H2.5l.5-2h4.92l1.04-4H4.04l.5-2h4.92L11 1h2l-1.54 6h4.08L17 1h2l-1.54 6H22.5l-.5 2h-4.92l-1.04 4h4.92l-.5 2h-4.92L14 21h-2l1.54-6h-4.08L8 21H5.88zm4.66-8h4.08l1.04-4h-4.08l-1.04 4z" />
    </svg>
    <svg v-else class="h-5 w-5 shrink-0 opacity-60" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 00-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 00-9-9z" />
    </svg>
    <span class="truncate">{{ channel.name }}</span>
  </button>
</template>
