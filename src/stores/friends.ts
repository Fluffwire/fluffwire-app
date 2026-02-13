import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Friend, FriendRequest } from '@/types'
import { friendApi } from '@/services/friendApi'
import { wsDispatcher, WS_EVENTS } from '@/services/wsDispatcher'
import { soundManager } from '@/composables/useSounds'

export const useFriendsStore = defineStore('friends', () => {
  const friends = ref<Friend[]>([])
  const pendingRequests = ref<FriendRequest[]>([])
  const isLoading = ref(false)

  const onlineFriends = computed(() =>
    friends.value.filter((f) => f.user.status !== 'offline')
  )

  function setFriends(data: Friend[]) {
    friends.value = data
  }

  function setupWsHandlers() {
    wsDispatcher.register(WS_EVENTS.FRIEND_REQUEST, (data: unknown) => {
      pendingRequests.value.push(data as FriendRequest)
      soundManager.play('friendRequest')
    })

    wsDispatcher.register(WS_EVENTS.FRIEND_ACCEPT, (data: unknown) => {
      const friend = data as Friend & { requestId: string }
      friends.value.push(friend)
      pendingRequests.value = pendingRequests.value.filter(
        (r) => r.id !== friend.requestId
      )
    })

    wsDispatcher.register(WS_EVENTS.FRIEND_REMOVE, (data: unknown) => {
      const { userId } = data as { userId: string }
      friends.value = friends.value.filter((f) => f.user.id !== userId)
    })
  }
  setupWsHandlers()

  async function fetchFriends() {
    isLoading.value = true
    try {
      const { data } = await friendApi.getFriends()
      friends.value = data
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRequests() {
    const { data } = await friendApi.getRequests()
    pendingRequests.value = data
  }

  async function sendRequest(username: string) {
    await friendApi.sendRequest(username)
  }

  async function acceptRequest(requestId: string) {
    const { data } = await friendApi.acceptRequest(requestId)
    friends.value.push(data)
    pendingRequests.value = pendingRequests.value.filter((r) => r.id !== requestId)
  }

  async function rejectRequest(requestId: string) {
    await friendApi.rejectRequest(requestId)
    pendingRequests.value = pendingRequests.value.filter((r) => r.id !== requestId)
  }

  async function removeFriend(friendId: string) {
    await friendApi.removeFriend(friendId)
    friends.value = friends.value.filter((f) => f.id !== friendId)
  }

  return {
    friends,
    pendingRequests,
    onlineFriends,
    isLoading,
    setFriends,
    fetchFriends,
    fetchRequests,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  }
})
