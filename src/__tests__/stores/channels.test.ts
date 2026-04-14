import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChannelsStore } from '@/stores/channels'
import type { Channel, ChannelCategory } from '@/types'

const wsHandlers = new Map<string, (data: unknown) => void>()

vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn((event: string, handler: (data: unknown) => void) => {
      wsHandlers.set(event, handler)
    }),
  },
  WS_EVENTS: {
    CHANNEL_CREATE: 'CHANNEL_CREATE',
    CHANNEL_UPDATE: 'CHANNEL_UPDATE',
    CHANNEL_DELETE: 'CHANNEL_DELETE',
    CHANNELS_REORDER: 'CHANNELS_REORDER',
    CATEGORY_CREATE: 'CATEGORY_CREATE',
    CATEGORY_UPDATE: 'CATEGORY_UPDATE',
    CATEGORY_DELETE: 'CATEGORY_DELETE',
    CATEGORIES_REORDER: 'CATEGORIES_REORDER',
  },
}))

vi.mock('@/services/channelApi', () => ({
  channelApi: {
    getChannels: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
    deleteChannel: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    reorderChannels: vi.fn(),
    reorderCategories: vi.fn(),
  },
}))

vi.mock('@/stores/readState', () => ({
  useReadStateStore: () => ({ registerChannelServer: vi.fn() }),
}))

vi.mock('@/stores/drafts', () => ({
  useDraftsStore: () => ({ clearDraftsForChannel: vi.fn() }),
}))

function makeChannel(id: string, type: 'text' | 'voice' = 'text', categoryId: string | null = null, serverId = 's1'): Channel {
  return { id, serverId, name: `channel-${id}`, type, categoryId, position: 0, accessMode: 'public', uploadsEnabled: true }
}

function makeCategory(id: string, serverId = 's1'): ChannelCategory {
  return { id, serverId, name: `cat-${id}`, position: 0 }
}

describe('channels store', () => {
  beforeEach(() => {
    wsHandlers.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useChannelsStore()
    expect(store.channels).toEqual([])
    expect(store.categories).toEqual([])
    expect(store.currentChannelId).toBeNull()
  })

  it('textChannels filters to text type only', () => {
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1', 'text'), makeChannel('c2', 'voice'), makeChannel('c3', 'text'))
    expect(store.textChannels).toHaveLength(2)
    expect(store.textChannels.every(c => c.type === 'text')).toBe(true)
  })

  it('voiceChannels filters to voice type only', () => {
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1', 'text'), makeChannel('c2', 'voice'))
    expect(store.voiceChannels).toHaveLength(1)
    expect(store.voiceChannels[0].id).toBe('c2')
  })

  it('currentChannel returns matching channel', () => {
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'), makeChannel('c2'))
    store.currentChannelId = 'c2'
    expect(store.currentChannel?.id).toBe('c2')
  })

  it('currentChannel returns null when unset', () => {
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'))
    expect(store.currentChannel).toBeNull()
  })

  it('channelsByCategory filters by categoryId', () => {
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1', 'text', 'cat1'), makeChannel('c2', 'text', null), makeChannel('c3', 'text', 'cat1'))
    expect(store.channelsByCategory('cat1')).toHaveLength(2)
    expect(store.channelsByCategory(null)).toHaveLength(1)
  })

  it('clearChannels resets all state', () => {
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'))
    store.categories.push(makeCategory('cat1'))
    store.currentChannelId = 'c1'
    store.clearChannels()
    expect(store.channels).toEqual([])
    expect(store.categories).toEqual([])
    expect(store.currentChannelId).toBeNull()
  })

  it('fetchChannels populates channels and categories', async () => {
    const { channelApi } = await import('@/services/channelApi')
    vi.mocked(channelApi.getChannels).mockResolvedValueOnce({
      data: { channels: [makeChannel('c1'), makeChannel('c2')], categories: [makeCategory('cat1')] },
    } as never)

    const store = useChannelsStore()
    await store.fetchChannels('s1')
    expect(store.channels).toHaveLength(2)
    expect(store.categories).toHaveLength(1)
    expect(store.isLoading).toBe(false)
  })

  it('createChannel adds channel and deduplicates', async () => {
    const { channelApi } = await import('@/services/channelApi')
    const ch = makeChannel('c1')
    vi.mocked(channelApi.createChannel).mockResolvedValueOnce({ data: ch } as never)

    const store = useChannelsStore()
    await store.createChannel('s1', { name: 'general', type: 'text' })
    expect(store.channels).toHaveLength(1)

    // Calling again with same id should not duplicate
    vi.mocked(channelApi.createChannel).mockResolvedValueOnce({ data: ch } as never)
    await store.createChannel('s1', { name: 'general', type: 'text' })
    expect(store.channels).toHaveLength(1)
  })

  it('updateChannel replaces existing channel', async () => {
    const { channelApi } = await import('@/services/channelApi')
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'))

    const updated = { ...makeChannel('c1'), name: 'renamed' }
    vi.mocked(channelApi.updateChannel).mockResolvedValueOnce({ data: updated } as never)

    await store.updateChannel('c1', { name: 'renamed' })
    expect(store.channels[0].name).toBe('renamed')
  })

  it('deleteChannel removes channel by id', async () => {
    const { channelApi } = await import('@/services/channelApi')
    vi.mocked(channelApi.deleteChannel).mockResolvedValueOnce(undefined as never)

    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'), makeChannel('c2'))
    await store.deleteChannel('c1')
    expect(store.channels).toHaveLength(1)
    expect(store.channels[0].id).toBe('c2')
  })

  it('deleteCategory moves its channels to uncategorized', async () => {
    const { channelApi } = await import('@/services/channelApi')
    vi.mocked(channelApi.deleteCategory).mockResolvedValueOnce(undefined as never)

    const store = useChannelsStore()
    store.channels.push(makeChannel('c1', 'text', 'cat1'), makeChannel('c2', 'text', 'cat2'))
    store.categories.push(makeCategory('cat1'), makeCategory('cat2'))
    await store.deleteCategory('s1', 'cat1')
    expect(store.categories).toHaveLength(1)
    expect(store.channels.find(c => c.id === 'c1')?.categoryId).toBeNull()
    expect(store.channels.find(c => c.id === 'c2')?.categoryId).toBe('cat2')
  })

  // WS handlers
  it('WS CHANNEL_CREATE adds channel (deduped)', () => {
    useChannelsStore()
    const handler = wsHandlers.get('CHANNEL_CREATE')!
    handler(makeChannel('c1'))
    handler(makeChannel('c1')) // duplicate
    const store = useChannelsStore()
    expect(store.channels).toHaveLength(1)
  })

  it('WS CHANNEL_UPDATE replaces channel', () => {
    useChannelsStore()
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'))
    wsHandlers.get('CHANNEL_UPDATE')!({ ...makeChannel('c1'), name: 'updated' })
    expect(store.channels[0].name).toBe('updated')
  })

  it('WS CHANNEL_DELETE removes channel', () => {
    useChannelsStore()
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'), makeChannel('c2'))
    wsHandlers.get('CHANNEL_DELETE')!({ id: 'c1' })
    expect(store.channels).toHaveLength(1)
    expect(store.channels[0].id).toBe('c2')
  })

  it('WS CHANNELS_REORDER replaces channels for the server', () => {
    useChannelsStore()
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1', 'text', null, 's1'), makeChannel('c2', 'text', null, 's2'))
    const reordered = [makeChannel('c3', 'text', null, 's1'), makeChannel('c1', 'text', null, 's1')]
    wsHandlers.get('CHANNELS_REORDER')!(reordered)
    // s1 channels replaced, s2 channel preserved
    expect(store.channels.filter(c => c.serverId === 's1')).toHaveLength(2)
    expect(store.channels.find(c => c.id === 'c2')).toBeDefined()
  })

  it('WS CATEGORY_CREATE adds category (deduped)', () => {
    useChannelsStore()
    wsHandlers.get('CATEGORY_CREATE')!(makeCategory('cat1'))
    wsHandlers.get('CATEGORY_CREATE')!(makeCategory('cat1'))
    const store = useChannelsStore()
    expect(store.categories).toHaveLength(1)
  })

  it('WS CATEGORY_DELETE removes category', () => {
    useChannelsStore()
    const store = useChannelsStore()
    store.categories.push(makeCategory('cat1'), makeCategory('cat2'))
    wsHandlers.get('CATEGORY_DELETE')!({ id: 'cat1' })
    expect(store.categories).toHaveLength(1)
    expect(store.categories[0].id).toBe('cat2')
  })

  it('WS CATEGORY_UPDATE replaces existing category', () => {
    useChannelsStore()
    const store = useChannelsStore()
    store.categories.push(makeCategory('cat1'))
    wsHandlers.get('CATEGORY_UPDATE')!({ ...makeCategory('cat1'), name: 'Updated' })
    expect(store.categories[0].name).toBe('Updated')
  })

  it('WS CATEGORIES_REORDER replaces categories for the server', () => {
    useChannelsStore()
    const store = useChannelsStore()
    store.categories.push(makeCategory('cat1', 's1'), makeCategory('cat2', 's1'), makeCategory('cat3', 's2'))
    const reordered = [makeCategory('cat2', 's1'), makeCategory('cat1', 's1')]
    wsHandlers.get('CATEGORIES_REORDER')!(reordered)
    // s1 categories reordered, s2 category preserved
    expect(store.categories.filter(c => c.serverId === 's1').map(c => c.id)).toEqual(['cat2', 'cat1'])
    expect(store.categories.find(c => c.id === 'cat3')).toBeDefined()
  })

  it('createCategory adds category (deduped)', async () => {
    const { channelApi } = await import('@/services/channelApi')
    const cat = makeCategory('cat1')
    vi.mocked(channelApi.createCategory).mockResolvedValueOnce({ data: cat } as never)

    const store = useChannelsStore()
    const result = await store.createCategory('s1', 'General')
    expect(result).toEqual(cat)
    expect(store.categories).toHaveLength(1)

    // Duplicate should not be added
    vi.mocked(channelApi.createCategory).mockResolvedValueOnce({ data: cat } as never)
    await store.createCategory('s1', 'General')
    expect(store.categories).toHaveLength(1)
  })

  it('updateCategory replaces existing category', async () => {
    const { channelApi } = await import('@/services/channelApi')
    const store = useChannelsStore()
    store.categories.push(makeCategory('cat1'))

    const updated = { ...makeCategory('cat1'), name: 'Renamed' }
    vi.mocked(channelApi.updateCategory).mockResolvedValueOnce({ data: updated } as never)

    await store.updateCategory('s1', 'cat1', 'Renamed')
    expect(store.categories[0].name).toBe('Renamed')
  })

  it('reorderChannels updates channels and categories from response', async () => {
    const { channelApi } = await import('@/services/channelApi')
    const store = useChannelsStore()
    store.channels.push(makeChannel('c1'), makeChannel('c2'))

    const reordered = [makeChannel('c2'), makeChannel('c1')]
    vi.mocked(channelApi.reorderChannels).mockResolvedValueOnce({
      data: { channels: reordered, categories: [] },
    } as never)

    await store.reorderChannels('s1', [{ id: 'c2', position: 0 }, { id: 'c1', position: 1 }])
    expect(store.channels[0].id).toBe('c2')
    expect(store.channels[1].id).toBe('c1')
  })

  it('reorderCategories updates channels and categories from response', async () => {
    const { channelApi } = await import('@/services/channelApi')
    const store = useChannelsStore()
    store.categories.push(makeCategory('cat1'), makeCategory('cat2'))

    const reordered = [makeCategory('cat2'), makeCategory('cat1')]
    vi.mocked(channelApi.reorderCategories).mockResolvedValueOnce({
      data: { channels: [], categories: reordered },
    } as never)

    await store.reorderCategories('s1', [{ id: 'cat2', position: 0 }, { id: 'cat1', position: 1 }])
    expect(store.categories[0].id).toBe('cat2')
    expect(store.categories[1].id).toBe('cat1')
  })
})
