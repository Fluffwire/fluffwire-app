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
    return commands.filter(cmd =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery)
    )
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

  function handleCommandRegister(data: BotCommand) {
    const commands = commandsByServer.value.get(data.serverId) || []
    // Add if not already exists
    if (!commands.find(c => c.id === data.id)) {
      commands.push(data)
      commandsByServer.value.set(data.serverId, commands)
    }
  }

  function handleCommandUpdate(data: BotCommand) {
    const commands = commandsByServer.value.get(data.serverId) || []
    const index = commands.findIndex(c => c.id === data.id)
    if (index !== -1) {
      commands[index] = data
      commandsByServer.value.set(data.serverId, commands)
    }
  }

  function handleCommandDelete(data: { commandId: string; serverId?: string }) {
    // If serverId not provided, search all servers
    if (data.serverId) {
      const commands = commandsByServer.value.get(data.serverId) || []
      const filtered = commands.filter(c => c.id !== data.commandId)
      commandsByServer.value.set(data.serverId, filtered)
    } else {
      // Remove from all servers
      commandsByServer.value.forEach((commands, serverId) => {
        const filtered = commands.filter(c => c.id !== data.commandId)
        commandsByServer.value.set(serverId, filtered)
      })
    }
  }

  function clearServerCommands(serverId: string) {
    commandsByServer.value.delete(serverId)
  }

  // WebSocket handlers setup
  function setupWsHandlers() {
    wsDispatcher.register('COMMAND_REGISTER', (data: unknown) => {
      handleCommandRegister(data as BotCommand)
    })

    wsDispatcher.register('COMMAND_UPDATE', (data: unknown) => {
      handleCommandUpdate(data as BotCommand)
    })

    wsDispatcher.register('COMMAND_DELETE', (data: unknown) => {
      handleCommandDelete(data as { commandId: string; serverId?: string })
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
