import api from './api'
import { API } from '@/constants/endpoints'
import type { Friend, FriendRequest } from '@/types'

export const friendApi = {
  getFriends(): Promise<{ data: Friend[] }> {
    return api.get(API.FRIENDS.BASE)
  },

  getRequests(): Promise<{ data: FriendRequest[] }> {
    return api.get(API.FRIENDS.REQUESTS)
  },

  sendRequest(username: string): Promise<{ data: FriendRequest }> {
    return api.post(API.FRIENDS.REQUESTS, { username })
  },

  acceptRequest(requestId: string): Promise<{ data: Friend }> {
    return api.post(API.FRIENDS.ACCEPT(requestId))
  },

  rejectRequest(requestId: string): Promise<void> {
    return api.post(API.FRIENDS.REJECT(requestId))
  },

  removeFriend(friendId: string): Promise<void> {
    return api.delete(API.FRIENDS.BY_ID(friendId))
  },
}
