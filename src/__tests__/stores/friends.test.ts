import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFriendsStore } from '@/stores/friends'
import type { Friend, FriendRequest } from '@/types'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    FRIEND_REQUEST: 'FRIEND_REQUEST',
    FRIEND_ACCEPT: 'FRIEND_ACCEPT',
    FRIEND_REMOVE: 'FRIEND_REMOVE',
  },
}))

vi.mock('@/services/friendApi', () => ({
  friendApi: {
    getFriends: vi.fn(),
    getRequests: vi.fn(),
    sendRequest: vi.fn(),
    acceptRequest: vi.fn(),
    rejectRequest: vi.fn(),
    removeFriend: vi.fn(),
  },
}))

vi.mock('@/composables/useSounds', () => ({
  soundManager: { play: vi.fn() },
}))

vi.mock('@/stores/presence', () => ({
  usePresenceStore: () => ({ getStatus: vi.fn().mockReturnValue('online') }),
}))

function makeFriend(id: string, userId: string): Friend {
  return {
    id,
    userId,
    user: { id: userId, username: `user-${userId}`, displayName: `User ${userId}`, avatar: null, status: 'online' },
    createdAt: '',
  }
}

function makeRequest(id: string): FriendRequest {
  return {
    id,
    fromUser: { id: 'u-from', username: 'sender', displayName: 'Sender', avatar: null },
    createdAt: '',
  }
}

describe('friends store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts with empty friends and requests', () => {
    const store = useFriendsStore()
    expect(store.friends).toEqual([])
    expect(store.pendingRequests).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('setFriends populates friends', () => {
    const store = useFriendsStore()
    store.setFriends([makeFriend('f1', 'u1'), makeFriend('f2', 'u2')])
    expect(store.friends).toHaveLength(2)
  })

  it('fetchFriends loads friends from API', async () => {
    const { friendApi } = await import('@/services/friendApi')
    vi.mocked(friendApi.getFriends).mockResolvedValueOnce({
      data: [makeFriend('f1', 'u1')],
    } as never)

    const store = useFriendsStore()
    await store.fetchFriends()
    expect(store.friends).toHaveLength(1)
    expect(store.isLoading).toBe(false)
  })

  it('fetchRequests loads pending requests', async () => {
    const { friendApi } = await import('@/services/friendApi')
    vi.mocked(friendApi.getRequests).mockResolvedValueOnce({
      data: [makeRequest('r1'), makeRequest('r2')],
    } as never)

    const store = useFriendsStore()
    await store.fetchRequests()
    expect(store.pendingRequests).toHaveLength(2)
  })

  it('acceptRequest adds friend and removes request', async () => {
    const { friendApi } = await import('@/services/friendApi')
    const store = useFriendsStore()
    store.pendingRequests.push(makeRequest('r1'))

    vi.mocked(friendApi.acceptRequest).mockResolvedValueOnce({
      data: makeFriend('f1', 'u2'),
    } as never)

    await store.acceptRequest('r1')
    expect(store.friends).toHaveLength(1)
    expect(store.pendingRequests).toHaveLength(0)
  })

  it('rejectRequest removes request without adding friend', async () => {
    const { friendApi } = await import('@/services/friendApi')
    vi.mocked(friendApi.rejectRequest).mockResolvedValueOnce(undefined as never)

    const store = useFriendsStore()
    store.pendingRequests.push(makeRequest('r1'))
    await store.rejectRequest('r1')
    expect(store.pendingRequests).toHaveLength(0)
    expect(store.friends).toHaveLength(0)
  })

  it('removeFriend removes by friend id', async () => {
    const { friendApi } = await import('@/services/friendApi')
    vi.mocked(friendApi.removeFriend).mockResolvedValueOnce(undefined as never)

    const store = useFriendsStore()
    store.friends.push(makeFriend('f1', 'u1'), makeFriend('f2', 'u2'))
    await store.removeFriend('f1')
    expect(store.friends).toHaveLength(1)
    expect(store.friends[0].id).toBe('f2')
  })

  // WS handlers
  it('WS FRIEND_REQUEST pushes to pendingRequests', () => {
    useFriendsStore()
    wsHandlers.get('FRIEND_REQUEST')!(makeRequest('r1'))
    const store = useFriendsStore()
    expect(store.pendingRequests).toHaveLength(1)
    expect(store.pendingRequests[0].id).toBe('r1')
  })

  it('WS FRIEND_ACCEPT adds friend and removes request', () => {
    useFriendsStore()
    const store = useFriendsStore()
    store.pendingRequests.push(makeRequest('r1'))

    wsHandlers.get('FRIEND_ACCEPT')!({ ...makeFriend('f1', 'u2'), requestId: 'r1' })
    expect(store.friends).toHaveLength(1)
    expect(store.pendingRequests).toHaveLength(0)
  })

  it('WS FRIEND_REMOVE removes friend by userId', () => {
    useFriendsStore()
    const store = useFriendsStore()
    store.friends.push(makeFriend('f1', 'u1'), makeFriend('f2', 'u2'))
    wsHandlers.get('FRIEND_REMOVE')!({ userId: 'u1' })
    expect(store.friends).toHaveLength(1)
    expect(store.friends[0].userId).toBe('u2')
  })
})
