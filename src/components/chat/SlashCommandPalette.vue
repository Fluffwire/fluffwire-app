<template>
  <div
    v-if="mode === 'list' && filteredCommands.length > 0"
    ref="paletteContainer"
    class="absolute bottom-full left-0 right-0 mb-2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-h-80 overflow-y-auto"
  >
    <div class="p-1 space-y-0.5">
      <div
        v-for="(cmd, index) in filteredCommands"
        :key="cmd.id"
        :ref="el => { if (el) commandRefs[index] = el as HTMLElement }"
        class="px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-2 text-sm"
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
            class="w-4 h-4 rounded-full"
          />
          <div
            v-else
            class="w-4 h-4 rounded-full bg-zinc-600 flex items-center justify-center text-[10px] font-medium"
          >
            {{ cmd.bot?.name?.[0]?.toUpperCase() || 'B' }}
          </div>
        </div>

        <!-- Command Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-medium text-white text-sm">/{{ cmd.name }}</span>
            <span v-if="cmd.minTier !== 'member'" class="text-[10px] text-zinc-400 px-1 py-0.5 bg-zinc-700 rounded">
              {{ cmd.minTier }}
            </span>
          </div>
          <p class="text-xs text-zinc-400 truncate">{{ cmd.description }}</p>
        </div>

        <!-- Bot Name -->
        <div class="text-[10px] text-zinc-500 flex-shrink-0">
          {{ cmd.bot?.name || 'Bot' }}
        </div>
      </div>
    </div>
  </div>

  <!-- Parameter Input Mode -->
  <div
    v-else-if="mode === 'params' && selectedCommand"
    class="absolute bottom-full left-0 right-0 mb-2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 p-4 space-y-3"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-700 pb-3">
      <div class="flex items-center gap-2">
        <span class="font-medium text-white">/{{ selectedCommand.name }}</span>
        <span class="text-sm text-zinc-400">{{ selectedCommand.description }}</span>
      </div>
      <button
        @click="cancelParams"
        class="text-zinc-400 hover:text-white transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Parameter Inputs -->
    <div class="space-y-3 max-h-64 overflow-y-auto">
      <div v-for="option in selectedCommand.options" :key="option.name" class="space-y-1">
        <label class="text-sm font-medium text-zinc-300 flex items-center gap-1">
          {{ option.description }}
          <span v-if="option.required" class="text-red-400">*</span>
        </label>

        <!-- String Input -->
        <input
          v-if="option.type === 'string'"
          v-model="paramValues[option.name]"
          type="text"
          :placeholder="option.description"
          :required="option.required"
          :minlength="option.minLength"
          :maxlength="option.maxLength"
          class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <!-- Integer Input -->
        <input
          v-else-if="option.type === 'integer'"
          v-model.number="paramValues[option.name]"
          type="number"
          :placeholder="option.description"
          :required="option.required"
          :min="option.minValue"
          :max="option.maxValue"
          class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <!-- Boolean Input -->
        <label v-else-if="option.type === 'boolean'" class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="paramValues[option.name]"
            type="checkbox"
            class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-sm text-zinc-400">Enable {{ option.name }}</span>
        </label>

        <!-- User Picker -->
        <select
          v-else-if="option.type === 'user'"
          v-model="paramValues[option.name]"
          :required="option.required"
          class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a user...</option>
          <option v-for="member in serverMembers" :key="member.user.id" :value="member.user.id">
            {{ member.user.displayName || member.user.username }}
          </option>
        </select>

        <!-- Channel Picker -->
        <select
          v-else-if="option.type === 'channel'"
          v-model="paramValues[option.name]"
          :required="option.required"
          class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a channel...</option>
          <option v-for="channel in serverChannels" :key="channel.id" :value="channel.id">
            # {{ channel.name }}
          </option>
        </select>

        <!-- Label Picker -->
        <select
          v-else-if="option.type === 'label'"
          v-model="paramValues[option.name]"
          :required="option.required"
          class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a label...</option>
          <option v-for="label in serverLabels" :key="label.id" :value="label.id">
            {{ label.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-2 pt-3 border-t border-zinc-700">
      <button
        @click="cancelParams"
        class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Cancel
      </button>
      <button
        @click="executeCommand"
        :disabled="!isFormValid"
        class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md transition-colors"
      >
        Execute
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCommandsStore } from '@/stores/commands'
import { useMembersStore } from '@/stores/members'
import { useChannelsStore } from '@/stores/channels'
import { useLabelsStore } from '@/stores/labels'
import type { BotCommand } from '@/types/command'

const props = defineProps<{
  serverId: string
  query: string
}>()

const emit = defineEmits<{
  execute: [commandId: string, options: Record<string, unknown>]
  close: []
  autocomplete: [commandName: string]
}>()

const commandsStore = useCommandsStore()
const membersStore = useMembersStore()
const channelsStore = useChannelsStore()
const labelsStore = useLabelsStore()

const mode = ref<'list' | 'params'>('list')
const selectedIndex = ref(0)
const selectedCommand = ref<BotCommand | null>(null)
const paramValues = ref<Record<string, unknown>>({})
const commandRefs = ref<Record<number, HTMLElement>>({})
const paletteContainer = ref<HTMLElement | null>(null)

// Filter commands based on query
const filteredCommands = computed(() => {
  return commandsStore.searchCommands(props.serverId, props.query)
})

// Scroll selected item into view
watch(selectedIndex, (newIndex) => {
  const element = commandRefs.value[newIndex]
  if (element && paletteContainer.value) {
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
})

// Get server data for pickers
const serverMembers = computed(() => membersStore.getMembers(props.serverId))
const serverChannels = computed(() => {
  const channels = channelsStore.channels.filter(ch => ch.serverId === props.serverId)
  return channels
})
const serverLabels = computed(() => labelsStore.getLabels(props.serverId))

// Validate form
const isFormValid = computed(() => {
  if (!selectedCommand.value) return false

  for (const option of selectedCommand.value.options) {
    if (option.required) {
      const value = paramValues.value[option.name]
      if (value === undefined || value === null || value === '') {
        return false
      }
    }
  }

  return true
})

// Reset selected index when query changes
watch(() => props.query, () => {
  selectedIndex.value = 0
})

// Keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (mode.value === 'params') {
    // In params mode, Escape cancels
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelParams()
    }
    return
  }

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
    case 'Tab':
      event.preventDefault()
      const autocompleteCmd = filteredCommands.value[selectedIndex.value]
      if (autocompleteCmd) {
        emit('autocomplete', autocompleteCmd.name)
      }
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
  // If command has no parameters, execute immediately
  if (!cmd.options || cmd.options.length === 0) {
    emit('execute', cmd.id, {})
    return
  }

  // Otherwise, show parameter input form
  selectedCommand.value = cmd
  mode.value = 'params'
  paramValues.value = {}

  // Set default values for boolean fields
  for (const option of cmd.options) {
    if (option.type === 'boolean') {
      paramValues.value[option.name] = false
    }
  }
}

function cancelParams() {
  mode.value = 'list'
  selectedCommand.value = null
  paramValues.value = {}
}

function executeCommand() {
  if (!selectedCommand.value || !isFormValid.value) return

  emit('execute', selectedCommand.value.id, paramValues.value)

  // Reset to list mode
  mode.value = 'list'
  selectedCommand.value = null
  paramValues.value = {}
}

// Expose keyboard handler for parent
defineExpose({
  handleKeydown
})
</script>
