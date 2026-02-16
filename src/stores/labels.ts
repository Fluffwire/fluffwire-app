import { defineStore } from 'pinia'
import { ref } from 'vue'
import { serverApi } from '@/services/serverApi'
import type { Label } from '@/types/server'
import { wsDispatcher } from '@/services/wsDispatcher'

export const useLabelsStore = defineStore('labels', () => {
  const labelsByServer = ref<Record<string, Label[]>>({})

  function getLabels(serverId: string): Label[] {
    return labelsByServer.value[serverId] || []
  }

  async function fetchLabels(serverId: string) {
    const labels = await serverApi.getLabels(serverId)
    labelsByServer.value[serverId] = labels
  }

  async function createLabel(serverId: string, name: string, color?: string) {
    const label = await serverApi.createLabel(serverId, name, color)
    if (!labelsByServer.value[serverId]) labelsByServer.value[serverId] = []
    // Only add if not already present (prevent duplicates from WebSocket)
    if (!labelsByServer.value[serverId].find(l => l.id === label.id)) {
      labelsByServer.value[serverId].push(label)
    }
    return label
  }

  async function updateLabel(serverId: string, labelId: string, updates: { name?: string; color?: string }) {
    const updated = await serverApi.updateLabel(serverId, labelId, updates)
    const labels = labelsByServer.value[serverId]
    if (labels) {
      const idx = labels.findIndex(l => l.id === labelId)
      if (idx !== -1) labels[idx] = updated
    }
    return updated
  }

  async function deleteLabel(serverId: string, labelId: string) {
    await serverApi.deleteLabel(serverId, labelId)
    const labels = labelsByServer.value[serverId]
    if (labels) {
      labelsByServer.value[serverId] = labels.filter(l => l.id !== labelId)
    }
  }

  async function reorderLabels(serverId: string, labelIds: string[]) {
    await serverApi.reorderLabels(serverId, labelIds)
    // Update local positions
    const labels = labelsByServer.value[serverId]
    if (labels) {
      labelIds.forEach((id, i) => {
        const label = labels.find(l => l.id === id)
        if (label) label.position = i
      })
      labels.sort((a, b) => a.position - b.position)
    }
  }

  async function setMemberTier(serverId: string, memberId: string, tier: string) {
    await serverApi.setMemberTier(serverId, memberId, tier)
  }

  async function transferOwnership(serverId: string, newOwnerId: string) {
    await serverApi.transferOwnership(serverId, newOwnerId)
  }

  // WebSocket event handlers
  wsDispatcher.register('LABEL_CREATE', (data: unknown) => {
    const label = data as Label
    if (!labelsByServer.value[label.serverId]) {
      labelsByServer.value[label.serverId] = []
    }
    // Only add if not already present (prevent duplicates from optimistic updates)
    if (!labelsByServer.value[label.serverId]!.find(l => l.id === label.id)) {
      labelsByServer.value[label.serverId]!.push(label)
    }
  })

  wsDispatcher.register('LABEL_UPDATE', (data: unknown) => {
    const label = data as Label
    const labels = labelsByServer.value[label.serverId]
    if (labels) {
      const idx = labels.findIndex(l => l.id === label.id)
      if (idx !== -1) labels[idx] = label
    }
  })

  wsDispatcher.register('LABEL_DELETE', (data: unknown) => {
    const payload = data as { id: string; serverId: string }
    const labels = labelsByServer.value[payload.serverId]
    if (labels) {
      labelsByServer.value[payload.serverId] = labels.filter(l => l.id !== payload.id)
    }
  })

  wsDispatcher.register('LABELS_REORDER', (data: unknown) => {
    const payload = data as { serverId: string; labels: Label[] }
    labelsByServer.value[payload.serverId] = payload.labels
  })

  return {
    labelsByServer,
    getLabels,
    fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    reorderLabels,
    setMemberTier,
    transferOwnership,
  }
})
