import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useServersStore } from '@/stores/servers'
import type { Server } from '@/types'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/serverApi', () => ({
  serverApi: {
    getServers: vi.fn(),
    createServer: vi.fn(),
    joinServer: vi.fn(),
    updateServer: vi.fn(),
    deleteServer: vi.fn(),
    leaveServer: vi.fn(),
    getMembers: vi.fn(),
  },
}))

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    SERVER_CREATE: 'SERVER_CREATE',
    SERVER_UPDATE: 'SERVER_UPDATE',
    SERVER_DELETE: 'SERVER_DELETE',
  },
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ isFetched: false, updateSetting: vi.fn() }),
}))

function makeServer(id: string, name = `server-${id}`): Server {
  return { id, name, ownerId: 'u1', icon: null, memberCount: 1, createdAt: '' }
}

describe('servers store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts with empty servers', () => {
    const store = useServersStore()
    expect(store.servers).toEqual([])
    expect(store.currentServerId).toBeNull()
  })

  it('setServers populates servers', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2')])
    expect(store.servers).toHaveLength(2)
  })

  it('orderedServers respects saved order', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2'), makeServer('s3')])
    store.saveServerOrder(['s3', 's1', 's2'])
    expect(store.orderedServers.map(s => s.id)).toEqual(['s3', 's1', 's2'])
  })

  it('orderedServers appends new servers not in order', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2'), makeServer('s3')])
    store.saveServerOrder(['s2', 's1'])
    expect(store.orderedServers.map(s => s.id)).toEqual(['s2', 's1', 's3'])
  })

  it('currentServer returns matching server', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2')])
    store.currentServerId = 's2'
    expect(store.currentServer?.id).toBe('s2')
  })

  it('currentServer returns null when no match', () => {
    const store = useServersStore()
    store.setServers([makeServer('s1')])
    store.currentServerId = 'nonexistent'
    expect(store.currentServer).toBeNull()
  })

  it('saveServerOrder persists to localStorage', () => {
    const store = useServersStore()
    store.saveServerOrder(['s2', 's1'])
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'fluffwire-server-order',
      JSON.stringify(['s2', 's1'])
    )
  })

  // CRUD
  it('fetchServers loads servers from API', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.getServers).mockResolvedValueOnce({
      data: [makeServer('s1'), makeServer('s2')],
    } as never)

    const store = useServersStore()
    await store.fetchServers()
    expect(store.servers).toHaveLength(2)
    expect(store.isLoading).toBe(false)
  })

  it('createServer adds server (deduped)', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.createServer).mockResolvedValueOnce({ data: makeServer('s1') } as never)

    const store = useServersStore()
    const result = await store.createServer('My Server')
    expect(result.id).toBe('s1')
    expect(store.servers).toHaveLength(1)

    // Adding same server again (e.g. via WS race) should not duplicate
    vi.mocked(serverApi.createServer).mockResolvedValueOnce({ data: makeServer('s1') } as never)
    await store.createServer('My Server')
    expect(store.servers).toHaveLength(1)
  })

  it('joinServer adds server to list', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.joinServer).mockResolvedValueOnce({ data: makeServer('s1') } as never)

    const store = useServersStore()
    const result = await store.joinServer('invite-code')
    expect(result.id).toBe('s1')
    expect(store.servers).toHaveLength(1)
  })

  it('updateServer replaces server in list', async () => {
    const { serverApi } = await import('@/services/serverApi')
    const store = useServersStore()
    store.setServers([makeServer('s1')])

    vi.mocked(serverApi.updateServer).mockResolvedValueOnce({
      data: { ...makeServer('s1'), name: 'Renamed' },
    } as never)

    await store.updateServer('s1', { name: 'Renamed' })
    expect(store.servers[0].name).toBe('Renamed')
  })

  it('deleteServer removes server', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.deleteServer).mockResolvedValueOnce(undefined as never)

    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2')])
    await store.deleteServer('s1')
    expect(store.servers).toHaveLength(1)
    expect(store.servers[0].id).toBe('s2')
  })

  it('leaveServer removes server', async () => {
    const { serverApi } = await import('@/services/serverApi')
    vi.mocked(serverApi.leaveServer).mockResolvedValueOnce(undefined as never)

    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2')])
    await store.leaveServer('s2')
    expect(store.servers).toHaveLength(1)
    expect(store.servers[0].id).toBe('s1')
  })

  // WS handlers
  it('WS SERVER_CREATE adds server (deduped)', () => {
    useServersStore()
    wsHandlers.get('SERVER_CREATE')!(makeServer('s1'))
    wsHandlers.get('SERVER_CREATE')!(makeServer('s1'))
    expect(useServersStore().servers).toHaveLength(1)
  })

  it('WS SERVER_UPDATE replaces server', () => {
    useServersStore()
    const store = useServersStore()
    store.setServers([makeServer('s1')])
    wsHandlers.get('SERVER_UPDATE')!({ ...makeServer('s1'), name: 'Updated' })
    expect(store.servers[0].name).toBe('Updated')
  })

  it('WS SERVER_DELETE removes server', () => {
    useServersStore()
    const store = useServersStore()
    store.setServers([makeServer('s1'), makeServer('s2')])
    wsHandlers.get('SERVER_DELETE')!({ id: 's1' })
    expect(store.servers).toHaveLength(1)
    expect(store.servers[0].id).toBe('s2')
  })
})
