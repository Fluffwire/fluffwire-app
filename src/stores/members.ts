import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ServerMember, User } from '@/types'
import { serverApi } from '@/services/serverApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { useAuthStore } from './auth'
import { useChannelsStore } from './channels'

export interface MemberWithUser extends ServerMember {
  user: User
}

export const useMembersStore = defineStore('members', () => {
  // Map of serverId -> members
  const membersByServer = ref<Map<string, MemberWithUser[]>>(new Map())
  const isLoading = ref(false)

  function getMembers(serverId: string): MemberWithUser[] {
    return membersByServer.value.get(serverId) ?? []
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.SERVER_MEMBER_ADD, (data: unknown) => {
      const { serverId, member } = data as { serverId: string; member: MemberWithUser }
      const members = membersByServer.value.get(serverId) ?? []
      members.push(member)
      membersByServer.value.set(serverId, members)
    })

    wsDispatcher.register(WS_EVENTS.SERVER_MEMBER_REMOVE, (data: unknown) => {
      const { serverId, userId } = data as { serverId: string; userId: string }
      const members = membersByServer.value.get(serverId)
      if (members) {
        membersByServer.value.set(
          serverId,
          members.filter((m) => m.userId !== userId)
        )
      }
    })

    wsDispatcher.register('MEMBER_TIER_UPDATE', (data: unknown) => {
      const { serverId, userId, tier } = data as { serverId: string; userId: string; tier: string }
      const members = membersByServer.value.get(serverId)
      if (members) {
        const member = members.find((m) => m.userId === userId)
        if (member) {
          member.tier = tier as 'owner' | 'admin' | 'moderator' | 'member'
        }
      }

      // If current user's tier changed, refetch channels (might have access to new private channels)
      const authStore = useAuthStore()
      if (authStore.user?.id === userId) {
        const channelsStore = useChannelsStore()
        channelsStore.fetchChannels(serverId)
      }
    })

    wsDispatcher.register('MEMBER_LABEL_UPDATE', (data: unknown) => {
      const { serverId, userId, labelIds } = data as { serverId: string; userId: string; labelIds: string[] }
      const members = membersByServer.value.get(serverId)
      if (members) {
        const member = members.find((m) => m.userId === userId)
        if (member) {
          member.labels = labelIds
        }
      }

      // If current user's labels changed, refetch channels (might have access to new private channels)
      const authStore = useAuthStore()
      if (authStore.user?.id === userId) {
        const channelsStore = useChannelsStore()
        channelsStore.fetchChannels(serverId)
      }
    })
  }
  setupWsHandlers()

  async function fetchMembers(serverId: string) {
    isLoading.value = true
    try {
      const { data } = await serverApi.getMembers(serverId)
      membersByServer.value.set(serverId, data as unknown as MemberWithUser[])
    } finally {
      isLoading.value = false
    }
  }

  return {
    membersByServer,
    isLoading,
    getMembers,
    fetchMembers,
  }
})
