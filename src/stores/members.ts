import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ServerMember, User } from '@/types'
import { serverApi } from '@/services/serverApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'

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
