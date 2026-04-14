import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMembersStore } from '@/stores/members'
import type { MemberWithUser } from '@/stores/members'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    SERVER_MEMBER_ADD: 'SERVER_MEMBER_ADD',
    SERVER_MEMBER_REMOVE: 'SERVER_MEMBER_REMOVE',
  },
}))

vi.mock('@/services/serverApi', () => ({
  serverApi: {
    getMembers: vi.fn(),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'me' } }),
}))

vi.mock('@/stores/channels', () => ({
  useChannelsStore: () => ({ fetchChannels: vi.fn() }),
}))

function makeMember(userId: string, serverId = 's1'): MemberWithUser {
  return {
    id: `member-${userId}`,
    userId,
    serverId,
    tier: 'member',
    labels: [],
    joinedAt: '',
    user: { id: userId, username: `user-${userId}`, displayName: `User ${userId}`, avatar: null, status: 'online' },
  }
}

describe('members store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('getMembers returns empty for unknown server', () => {
    const store = useMembersStore()
    expect(store.getMembers('s1')).toEqual([])
  })

  it('fetchMembers loads members for server', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.getMembers).mockResolvedValueOnce({
      data: [makeMember('u1'), makeMember('u2')],
    } as never)

    const store = useMembersStore()
    await store.fetchMembers('s1')
    expect(store.getMembers('s1')).toHaveLength(2)
    expect(store.isLoading).toBe(false)
  })

  it('fetchMembers isolates by server', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.getMembers).mockResolvedValueOnce({ data: [makeMember('u1', 's1')] } as never)
    vi.mocked(serverApi.getMembers).mockResolvedValueOnce({ data: [makeMember('u2', 's2'), makeMember('u3', 's2')] } as never)

    const store = useMembersStore()
    await store.fetchMembers('s1')
    await store.fetchMembers('s2')
    expect(store.getMembers('s1')).toHaveLength(1)
    expect(store.getMembers('s2')).toHaveLength(2)
  })

  // WS handlers
  it('WS SERVER_MEMBER_ADD adds member to server', () => {
    useMembersStore()
    const store = useMembersStore()
    store.membersByServer.set('s1', [makeMember('u1')])
    wsHandlers.get('SERVER_MEMBER_ADD')!({ serverId: 's1', member: makeMember('u2') })
    expect(store.getMembers('s1')).toHaveLength(2)
  })

  it('WS SERVER_MEMBER_ADD creates server entry if not present', () => {
    useMembersStore()
    wsHandlers.get('SERVER_MEMBER_ADD')!({ serverId: 's1', member: makeMember('u1') })
    const store = useMembersStore()
    expect(store.getMembers('s1')).toHaveLength(1)
  })

  it('WS SERVER_MEMBER_REMOVE removes member by userId', () => {
    useMembersStore()
    const store = useMembersStore()
    store.membersByServer.set('s1', [makeMember('u1'), makeMember('u2')])
    wsHandlers.get('SERVER_MEMBER_REMOVE')!({ serverId: 's1', userId: 'u1' })
    expect(store.getMembers('s1')).toHaveLength(1)
    expect(store.getMembers('s1')[0].userId).toBe('u2')
  })

  it('WS MEMBER_TIER_UPDATE updates member tier', () => {
    useMembersStore()
    const store = useMembersStore()
    store.membersByServer.set('s1', [makeMember('u1')])
    wsHandlers.get('MEMBER_TIER_UPDATE')!({ serverId: 's1', userId: 'u1', tier: 'admin' })
    expect(store.getMembers('s1')[0].tier).toBe('admin')
  })

  it('WS MEMBER_LABEL_UPDATE updates member labels', () => {
    useMembersStore()
    const store = useMembersStore()
    store.membersByServer.set('s1', [makeMember('u1')])
    wsHandlers.get('MEMBER_LABEL_UPDATE')!({ serverId: 's1', userId: 'u1', labelIds: ['lbl1', 'lbl2'] })
    expect(store.getMembers('s1')[0].labels).toEqual(['lbl1', 'lbl2'])
  })
})
