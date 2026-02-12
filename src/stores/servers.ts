import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Server } from '@/types'
import { serverApi } from '@/services/serverApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

export const useServersStore = defineStore('servers', () => {
  const servers = ref<Server[]>([])
  const currentServerId = ref<string | null>(null)
  const isLoading = ref(false)

  const currentServer = computed(() =>
    servers.value.find((s) => s.id === currentServerId.value) ?? null
  )

  function setServers(data: Server[]) {
    servers.value = data
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.SERVER_CREATE, (data: unknown) => {
      const server = data as Server
      if (!servers.value.find((s) => s.id === server.id)) {
        servers.value.push(server)
      }
    })
    wsDispatcher.register(WS_EVENTS.SERVER_UPDATE, (data: unknown) => {
      const updated = data as Server
      const idx = servers.value.findIndex((s) => s.id === updated.id)
      if (idx !== -1) servers.value[idx] = updated
    })
    wsDispatcher.register(WS_EVENTS.SERVER_DELETE, (data: unknown) => {
      const { id } = data as { id: string }
      servers.value = servers.value.filter((s) => s.id !== id)
    })
  }
  setupWsHandlers()

  async function fetchServers() {
    isLoading.value = true
    try {
      const { data } = await serverApi.getServers()
      servers.value = data
    } finally {
      isLoading.value = false
    }
  }

  async function createServer(name: string) {
    const { data } = await serverApi.createServer({ name })
    // WS SERVER_CREATE handler also adds the server; prevent duplicates
    if (!servers.value.find((s) => s.id === data.id)) {
      servers.value.push(data)
    }
    return data
  }

  async function joinServer(inviteCode: string) {
    const { data } = await serverApi.joinServer({ inviteCode })
    if (!servers.value.find((s) => s.id === data.id)) {
      servers.value.push(data)
    }
    return data
  }

  async function updateServer(id: string, data: Partial<{ name: string }>) {
    const { data: updated } = await serverApi.updateServer(id, data)
    const idx = servers.value.findIndex((s) => s.id === id)
    if (idx !== -1) servers.value[idx] = updated
    return updated
  }

  async function deleteServer(id: string) {
    await serverApi.deleteServer(id)
    servers.value = servers.value.filter((s) => s.id !== id)
  }

  async function leaveServer(id: string) {
    await serverApi.leaveServer(id)
    servers.value = servers.value.filter((s) => s.id !== id)
  }

  return {
    servers,
    currentServerId,
    currentServer,
    isLoading,
    setServers,
    fetchServers,
    createServer,
    updateServer,
    joinServer,
    deleteServer,
    leaveServer,
  }
})
