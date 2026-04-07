import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BotCommand } from '@/types/command'
import { commandApi } from '@/services/commandApi'
import { wsDispatcher } from '@/services/wsDispatcher'

export const useCommandsStore = defineStore('commands', () => {
  // State
  const commandsByServer = ref(new Map<string, BotCommand[]>())

  // Getters
  const getServerCommands = computed(() => (serverId: string) => {
    return commandsByServer.value.get(serverId) || []
  })

  const searchCommands = computed(() => (serverId: string, query: string) => {
    const commands = commandsByServer.value.get(serverId) || []
    if (!query) return commands

    const lowerQuery = query.toLowerCase()

    // Only match on command NAME, not description (to avoid noise)
    const prefixMatches: BotCommand[] = []
    const substringMatches: BotCommand[] = []

    for (const cmd of commands) {
      const lowerName = cmd.name.toLowerCase()

      // Prioritize commands that START with the query
      if (lowerName.startsWith(lowerQuery)) {
        prefixMatches.push(cmd)
      }
      // Then include commands that contain the query in the name
      else if (lowerName.includes(lowerQuery)) {
        substringMatches.push(cmd)
      }
    }

    // Return prefix matches first (e.g., "context" before "compact")
    return [...prefixMatches, ...substringMatches]
  })

  // Actions
  async function fetchServerCommands(serverId: string) {
    try {
      const commands = await commandApi.listServerCommands(serverId)
      commandsByServer.value.set(serverId, commands)
    } catch (error) {
      console.error('Failed to fetch server commands:', error)
    }
  }

  function handleCommandRegister(data: { serverId: string; command: BotCommand }) {
    const commands = commandsByServer.value.get(data.serverId) || []
    // Add if not already exists
    if (!commands.find(c => c.id === data.command.id)) {
      commands.push(data.command)
      commandsByServer.value.set(data.serverId, commands)
    }
  }

  function handleCommandUpdate(data: { serverId: string; command: BotCommand }) {
    const commands = commandsByServer.value.get(data.serverId) || []
    const index = commands.findIndex(c => c.id === data.command.id)
    if (index !== -1) {
      commands[index] = data.command
      commandsByServer.value.set(data.serverId, commands)
    }
  }

  function handleCommandDelete(data: { commandId: string; serverId: string }) {
    const commands = commandsByServer.value.get(data.serverId) || []
    const filtered = commands.filter(c => c.id !== data.commandId)
    commandsByServer.value.set(data.serverId, filtered)
  }

  function clearServerCommands(serverId: string) {
    commandsByServer.value.delete(serverId)
  }

  // WebSocket handlers setup
  function setupWsHandlers() {
    wsDispatcher.register('COMMAND_REGISTER', (data: unknown) => {
      handleCommandRegister(data as { serverId: string; command: BotCommand })
    })

    wsDispatcher.register('COMMAND_UPDATE', (data: unknown) => {
      handleCommandUpdate(data as { serverId: string; command: BotCommand })
    })

    wsDispatcher.register('COMMAND_DELETE', (data: unknown) => {
      handleCommandDelete(data as { commandId: string; serverId: string })
    })
  }

  // Register handlers immediately
  setupWsHandlers()

  return {
    // State
    commandsByServer,
    // Getters
    getServerCommands,
    searchCommands,
    // Actions
    fetchServerCommands,
    clearServerCommands
  }
})
