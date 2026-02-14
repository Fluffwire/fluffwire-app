import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import api from '@/services/api'
import { API } from '@/constants/endpoints'
import type { Message } from '@/types'

interface ReadState {
  userId: string
  channelId: string
  lastMessageId: string
}

export const useReadStateStore = defineStore('readState', () => {
  // channelId -> lastReadMessageId
  const readStates = ref<Map<string, string>>(new Map())
  // channelId -> latestMessageId (from MESSAGE_CREATE events)
  const latestMessageIds = ref<Map<string, string>>(new Map())
  // channelId -> serverId mapping (populated from messages and channel loads)
  const channelServerMap = ref<Map<string, string>>(new Map())

  const unreadChannels = computed(() => {
    const unread = new Set<string>()
    for (const [channelId, latestId] of latestMessageIds.value) {
      const lastRead = readStates.value.get(channelId)
      if (!lastRead || lastRead < latestId) {
        unread.add(channelId)
      }
    }
    return unread
  })

  function isUnread(channelId: string): boolean {
    return unreadChannels.value.has(channelId)
  }

  function hasUnreadInServer(serverId: string): boolean {
    for (const channelId of unreadChannels.value) {
      if (channelServerMap.value.get(channelId) === serverId) return true
    }
    return false
  }

  function hasUnreadDMs(): boolean {
    // Check if any unread channel is NOT in channelServerMap (i.e., it's a DM)
    for (const channelId of unreadChannels.value) {
      if (!channelServerMap.value.has(channelId)) return true
    }
    return false
  }

  function registerChannelServer(channelId: string, serverId: string) {
    channelServerMap.value.set(channelId, serverId)
  }

  function setReadStates(states: ReadState[]) {
    for (const s of states) {
      readStates.value.set(s.channelId, s.lastMessageId)
      // Also set as latest if we don't know of anything newer
      if (!latestMessageIds.value.has(s.channelId)) {
        latestMessageIds.value.set(s.channelId, s.lastMessageId)
      }
    }
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.MESSAGE_CREATE, (data: unknown) => {
      const message = data as Message
      latestMessageIds.value.set(message.channelId, message.id)
    })
  }
  setupWsHandlers()

  async function markAsRead(channelId: string) {
    const latestId = latestMessageIds.value.get(channelId)
    if (!latestId) return
    const lastRead = readStates.value.get(channelId)
    if (lastRead === latestId) return

    readStates.value.set(channelId, latestId)
    try {
      await api.post(API.CHANNELS.ACK(channelId), { messageId: latestId })
    } catch {
      // Revert on failure
      if (lastRead) {
        readStates.value.set(channelId, lastRead)
      } else {
        readStates.value.delete(channelId)
      }
    }
  }

  return {
    readStates,
    latestMessageIds,
    unreadChannels,
    isUnread,
    hasUnreadInServer,
    hasUnreadDMs,
    registerChannelServer,
    setReadStates,
    markAsRead,
  }
})
