<template>
  <div
    v-if="filteredCommands.length > 0"
    class="absolute bottom-full left-0 right-0 mb-2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-h-64 overflow-y-auto"
  >
    <div class="p-2 space-y-1">
      <div
        v-for="(cmd, index) in filteredCommands"
        :key="cmd.id"
        class="px-3 py-2 rounded cursor-pointer transition-colors flex items-center gap-3"
        :class="{
          'bg-zinc-700': index === selectedIndex,
          'hover:bg-zinc-700/50': index !== selectedIndex
        }"
        @click="selectCommand(cmd)"
        @mouseenter="selectedIndex = index"
      >
        <!-- Bot Avatar -->
        <div class="flex-shrink-0">
          <img
            v-if="cmd.bot?.avatar"
            :src="cmd.bot.avatar"
            :alt="cmd.bot.name"
            class="w-6 h-6 rounded-full"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-medium"
          >
            {{ cmd.bot?.name?.[0]?.toUpperCase() || 'B' }}
          </div>
        </div>

        <!-- Command Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-white">/{{ cmd.name }}</span>
            <span v-if="cmd.minTier !== 'member'" class="text-xs text-zinc-400 px-1.5 py-0.5 bg-zinc-700 rounded">
              {{ cmd.minTier }}
            </span>
          </div>
          <p class="text-sm text-zinc-400 truncate">{{ cmd.description }}</p>
        </div>

        <!-- Bot Name -->
        <div class="text-xs text-zinc-500">
          {{ cmd.bot?.name || 'Unknown Bot' }}
        </div>
      </div>
    </div>

    <div v-if="filteredCommands.length === 0" class="p-4 text-center text-zinc-500 text-sm">
      No commands found
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCommandsStore } from '@/stores/commands'
import type { BotCommand } from '@/types/command'

const props = defineProps<{
  serverId: string
  query: string
}>()

const emit = defineEmits<{
  select: [command: BotCommand]
  close: []
}>()

const commandsStore = useCommandsStore()
const selectedIndex = ref(0)

// Filter commands based on query
const filteredCommands = computed(() => {
  return commandsStore.searchCommands(props.serverId, props.query)
})

// Reset selected index when query changes
watch(() => props.query, () => {
  selectedIndex.value = 0
})

// Keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (filteredCommands.value.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = selectedIndex.value === 0
        ? filteredCommands.value.length - 1
        : selectedIndex.value - 1
      break
    case 'Enter':
      event.preventDefault()
      const selected = filteredCommands.value[selectedIndex.value]
      if (selected) {
        selectCommand(selected)
      }
      break
    case 'Escape':
      event.preventDefault()
      emit('close')
      break
  }
}

function selectCommand(cmd: BotCommand) {
  emit('select', cmd)
}

// Expose keyboard handler for parent
defineExpose({
  handleKeydown
})
</script>
