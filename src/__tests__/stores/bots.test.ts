import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBotsStore } from '@/stores/bots'
import { botApi } from '@/services/botApi'
import type { Bot, BotWithToken } from '@/types'

// Mock the botApi
vi.mock('@/services/botApi', () => ({
  botApi: {
    listBots: vi.fn(),
    createBot: vi.fn(),
    updateBot: vi.fn(),
    deleteBot: vi.fn(),
    regenerateToken: vi.fn(),
  },
}))

describe('bots store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('fetchUserBots', () => {
    it('should fetch and store user bots', async () => {
      const mockBots: Bot[] = [
        {
          id: 'bot1',
          name: 'Test Bot 1',
          avatar: null,
          description: 'Test description',
          ownerId: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'bot2',
          name: 'Test Bot 2',
          avatar: 'https://example.com/avatar.png',
          ownerId: 'user1',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ]

      vi.mocked(botApi.listBots).mockResolvedValue({ data: mockBots })

      const store = useBotsStore()
      await store.fetchUserBots()

      expect(botApi.listBots).toHaveBeenCalledTimes(1)
      expect(store.userBots).toEqual(mockBots)
      expect(store.isLoading).toBe(false)
    })

    it('should set isLoading correctly during fetch', async () => {
      vi.mocked(botApi.listBots).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: [] }), 100)
          })
      )

      const store = useBotsStore()
      expect(store.isLoading).toBe(false)

      const fetchPromise = store.fetchUserBots()
      expect(store.isLoading).toBe(true)

      await fetchPromise
      expect(store.isLoading).toBe(false)
    })

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(botApi.listBots).mockRejectedValue(new Error('Network error'))

      const store = useBotsStore()
      await expect(store.fetchUserBots()).rejects.toThrow('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createBot', () => {
    it('should create a bot and add it to the store', async () => {
      const newBot: BotWithToken = {
        id: 'bot1',
        name: 'New Bot',
        avatar: null,
        description: 'Test bot',
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        token: 'secret-token-123',
      }

      vi.mocked(botApi.createBot).mockResolvedValue({ data: newBot })

      const store = useBotsStore()
      const result = await store.createBot({
        name: 'New Bot',
        description: 'Test bot',
      })

      expect(botApi.createBot).toHaveBeenCalledWith({
        name: 'New Bot',
        description: 'Test bot',
      })
      expect(result).toEqual(newBot)
      expect(store.userBots).toHaveLength(1)
      expect(store.userBots[0]).toEqual(newBot)
    })

    it('should return bot with token on creation', async () => {
      const newBot: BotWithToken = {
        id: 'bot1',
        name: 'New Bot',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        token: 'secret-token-456',
      }

      vi.mocked(botApi.createBot).mockResolvedValue({ data: newBot })

      const store = useBotsStore()
      const result = await store.createBot({ name: 'New Bot' })

      expect(result.token).toBe('secret-token-456')
    })
  })

  describe('updateBot', () => {
    it('should update an existing bot', async () => {
      const existingBot: Bot = {
        id: 'bot1',
        name: 'Old Name',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const updatedBot: Bot = {
        ...existingBot,
        name: 'New Name',
        description: 'Updated description',
      }

      vi.mocked(botApi.updateBot).mockResolvedValue({ data: updatedBot })

      const store = useBotsStore()
      store.userBots = [existingBot]

      await store.updateBot('bot1', {
        name: 'New Name',
        description: 'Updated description',
      })

      expect(botApi.updateBot).toHaveBeenCalledWith('bot1', {
        name: 'New Name',
        description: 'Updated description',
      })
      expect(store.userBots[0].name).toBe('New Name')
      expect(store.userBots[0].description).toBe('Updated description')
    })

    it('should not modify other bots when updating', async () => {
      const bot1: Bot = {
        id: 'bot1',
        name: 'Bot 1',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const bot2: Bot = {
        id: 'bot2',
        name: 'Bot 2',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-02T00:00:00Z',
      }

      const updatedBot1 = { ...bot1, name: 'Updated Bot 1' }

      vi.mocked(botApi.updateBot).mockResolvedValue({ data: updatedBot1 })

      const store = useBotsStore()
      store.userBots = [bot1, bot2]

      await store.updateBot('bot1', { name: 'Updated Bot 1' })

      expect(store.userBots[0].name).toBe('Updated Bot 1')
      expect(store.userBots[1].name).toBe('Bot 2')
      expect(store.userBots).toHaveLength(2)
    })
  })

  describe('deleteBot', () => {
    it('should delete a bot from the store', async () => {
      const bot1: Bot = {
        id: 'bot1',
        name: 'Bot 1',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const bot2: Bot = {
        id: 'bot2',
        name: 'Bot 2',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-02T00:00:00Z',
      }

      vi.mocked(botApi.deleteBot).mockResolvedValue()

      const store = useBotsStore()
      store.userBots = [bot1, bot2]

      await store.deleteBot('bot1')

      expect(botApi.deleteBot).toHaveBeenCalledWith('bot1')
      expect(store.userBots).toHaveLength(1)
      expect(store.userBots[0].id).toBe('bot2')
    })

    it('should handle deleting non-existent bot', async () => {
      vi.mocked(botApi.deleteBot).mockResolvedValue()

      const store = useBotsStore()
      store.userBots = []

      await store.deleteBot('non-existent')

      expect(botApi.deleteBot).toHaveBeenCalledWith('non-existent')
      expect(store.userBots).toHaveLength(0)
    })
  })

  describe('regenerateToken', () => {
    it('should regenerate token and update bot', async () => {
      const existingBot: Bot = {
        id: 'bot1',
        name: 'Test Bot',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const botWithNewToken: BotWithToken = {
        ...existingBot,
        token: 'new-secret-token-789',
      }

      vi.mocked(botApi.regenerateToken).mockResolvedValue({ data: botWithNewToken })

      const store = useBotsStore()
      store.userBots = [existingBot]

      const newToken = await store.regenerateToken('bot1')

      expect(botApi.regenerateToken).toHaveBeenCalledWith('bot1')
      expect(newToken).toBe('new-secret-token-789')
      expect(store.userBots[0]).toEqual(botWithNewToken)
    })

    it('should return the new token', async () => {
      const botWithToken: BotWithToken = {
        id: 'bot1',
        name: 'Test Bot',
        avatar: null,
        ownerId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        token: 'regenerated-token',
      }

      vi.mocked(botApi.regenerateToken).mockResolvedValue({ data: botWithToken })

      const store = useBotsStore()
      store.userBots = [
        {
          id: 'bot1',
          name: 'Test Bot',
          avatar: null,
          ownerId: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      const token = await store.regenerateToken('bot1')

      expect(token).toBe('regenerated-token')
    })
  })

  describe('state initialization', () => {
    it('should initialize with empty bots array', () => {
      const store = useBotsStore()
      expect(store.userBots).toEqual([])
      expect(store.isLoading).toBe(false)
    })
  })
})
