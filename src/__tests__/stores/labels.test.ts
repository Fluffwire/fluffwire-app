import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLabelsStore } from '@/stores/labels'
import { serverApi } from '@/services/serverApi'
import type { Label } from '@/types/server'

vi.mock('@/services/serverApi')
vi.mock('@/services/wsDispatcher', () => ({
  wsDispatcher: {
    register: vi.fn(),
  },
}))

describe('Labels Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('fetchLabels', () => {
    it('should fetch and store labels for a server', async () => {
      const mockLabels: Label[] = [
        {
          id: '1',
          serverId: 'server1',
          name: 'Admin',
          color: '#ff0000',
          position: 1,
          isEveryone: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          serverId: 'server1',
          name: '@everyone',
          position: 0,
          isEveryone: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(serverApi.getLabels).mockResolvedValue(mockLabels)

      const store = useLabelsStore()
      await store.fetchLabels('server1')

      expect(store.getLabels('server1')).toEqual(mockLabels)
    })
  })

  describe('createLabel', () => {
    it('should create a new label', async () => {
      const mockLabel: Label = {
        id: '3',
        serverId: 'server1',
        name: 'Moderator',
        color: '#0000ff',
        position: 2,
        isEveryone: false,
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(serverApi.createLabel).mockResolvedValue(mockLabel)

      const store = useLabelsStore()
      const result = await store.createLabel('server1', 'Moderator', '#0000ff')

      expect(result).toEqual(mockLabel)
      const labels = store.getLabels('server1')
      expect(labels).toHaveLength(1)
      expect(labels[0]).toEqual(mockLabel)
    })
  })

  describe('updateLabel', () => {
    it('should update an existing label', async () => {
      const store = useLabelsStore()
      store.labelsByServer['server1'] = [
        {
          id: '1',
          serverId: 'server1',
          name: 'Admin',
          color: '#ff0000',
          position: 1,
          isEveryone: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      const updatedLabel: Label = {
        id: '1',
        serverId: 'server1',
        name: 'Super Admin',
        color: '#ff0000',
        position: 1,
        isEveryone: false,
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(serverApi.updateLabel).mockResolvedValue(updatedLabel)

      await store.updateLabel('server1', '1', { name: 'Super Admin' })

      expect(store.getLabels('server1')[0].name).toBe('Super Admin')
    })
  })

  describe('deleteLabel', () => {
    it('should delete a label', async () => {
      const store = useLabelsStore()
      store.labelsByServer['server1'] = [
        {
          id: '1',
          serverId: 'server1',
          name: 'Admin',
          color: '#ff0000',
          position: 1,
          isEveryone: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(serverApi.deleteLabel).mockResolvedValue()

      await store.deleteLabel('server1', '1')

      expect(store.getLabels('server1')).toHaveLength(0)
    })
  })

  describe('setMemberTier', () => {
    it('should call API to set member tier', async () => {
      vi.mocked(serverApi.setMemberTier).mockResolvedValue({})

      const store = useLabelsStore()
      await store.setMemberTier('server1', 'user1', 'admin')

      expect(serverApi.setMemberTier).toHaveBeenCalledWith('server1', 'user1', 'admin')
    })
  })

  describe('transferOwnership', () => {
    it('should call API to transfer ownership', async () => {
      vi.mocked(serverApi.transferOwnership).mockResolvedValue({})

      const store = useLabelsStore()
      await store.transferOwnership('server1', 'user2')

      expect(serverApi.transferOwnership).toHaveBeenCalledWith('server1', 'user2')
    })
  })
})
