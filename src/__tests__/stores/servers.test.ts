import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useServersStore } from '@/stores/servers'
import type { Server } from '@/types'

vi.mock('@/services/serverApi', () => ({
  serverApi: {
    getServers: vi.fn(),
    createServer: vi.fn(),
    deleteServer: vi.fn(),
  },
}))

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: { register: vi.fn() },
  WS_EVENTS: {
    SERVER_CREATE: 'SERVER_CREATE',
    SERVER_UPDATE: 'SERVER_UPDATE',
    SERVER_DELETE: 'SERVER_DELETE',
    SERVER_MEMBER_JOIN: 'SERVER_MEMBER_JOIN',
    SERVER_MEMBER_LEAVE: 'SERVER_MEMBER_LEAVE',
  },
}))

function makeServer(id: string, name: string): Server {
  return { id, name, ownerId: 'u1', icon: null, memberCount: 1, createdAt: '' }
}

describe('servers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts with empty servers', () => {
    const store = useServersStore()
    expect(store.servers).toEqual([])
    expect(store.currentServerId).toBeNull()
  })

  it('setServers populates servers', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1', 'Alpha'), makeServer('s2', 'Beta')])
    expect(store.servers).toHaveLength(2)
  })

  it('orderedServers respects saved order', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1', 'Alpha'), makeServer('s2', 'Beta'), makeServer('s3', 'Gamma')])

    store.saveServerOrder(['s3', 's1', 's2'])
    const ordered = store.orderedServers
    expect(ordered.map(s => s.id)).toEqual(['s3', 's1', 's2'])
  })

  it('orderedServers appends new servers not in order', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1', 'Alpha'), makeServer('s2', 'Beta'), makeServer('s3', 'New')])

    store.saveServerOrder(['s2', 's1'])
    const ordered = store.orderedServers
    expect(ordered.map(s => s.id)).toEqual(['s2', 's1', 's3'])
  })

  it('currentServer returns matching server', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1', 'Alpha'), makeServer('s2', 'Beta')])
    store.currentServerId = 's2'
    expect(store.currentServer?.name).toBe('Beta')
  })

  it('currentServer returns null when no match', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1', 'Alpha')])
    store.currentServerId = 'nonexistent'
    expect(store.currentServer).toBeNull()
  })
})
