import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDraftsStore } from '@/stores/drafts'

describe('Drafts Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getDraft', () => {
    it('should return empty string for new channel', () => {
      const store = useDraftsStore()
      const draft = store.getDraft('channel-1')
      expect(draft).toBe('')
    })

    it('should return draft from memory cache', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Hello world')
      const draft = store.getDraft('channel-1')
      expect(draft).toBe('Hello world')
    })

    it('should return draft from localStorage', () => {
      localStorage.setItem('fluffwire-draft:channel-1', 'Saved draft')
      const store = useDraftsStore()
      const draft = store.getDraft('channel-1')
      expect(draft).toBe('Saved draft')
    })

    it('should cache draft from localStorage to memory', () => {
      localStorage.setItem('fluffwire-draft:channel-1', 'Saved draft')
      const store = useDraftsStore()

      // First call loads from localStorage
      store.getDraft('channel-1')

      // Clear localStorage to verify memory cache is used
      localStorage.clear()
      const draft = store.getDraft('channel-1')
      expect(draft).toBe('Saved draft')
    })
  })

  describe('setDraft', () => {
    it('should save draft to memory and localStorage', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Test draft')

      expect(store.getDraft('channel-1')).toBe('Test draft')
      expect(localStorage.getItem('fluffwire-draft:channel-1')).toBe('Test draft')
    })

    it('should clear draft when text is empty', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Test draft')
      store.setDraft('channel-1', '')

      expect(store.getDraft('channel-1')).toBe('')
      expect(localStorage.getItem('fluffwire-draft:channel-1')).toBeNull()
    })

    it('should clear draft when text is only whitespace', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Test draft')
      store.setDraft('channel-1', '   ')

      expect(store.getDraft('channel-1')).toBe('')
      expect(localStorage.getItem('fluffwire-draft:channel-1')).toBeNull()
    })

    it('should truncate draft if it exceeds max length', () => {
      const store = useDraftsStore()
      const longDraft = 'a'.repeat(15000) // Exceeds MAX_DRAFT_LENGTH of 10000
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      store.setDraft('channel-1', longDraft)

      const saved = store.getDraft('channel-1')
      expect(saved.length).toBe(10000)
      expect(consoleSpy).toHaveBeenCalledWith('Draft too long, truncating')

      consoleSpy.mockRestore()
    })

    it('should handle multiple channels independently', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Draft 1')
      store.setDraft('channel-2', 'Draft 2')
      store.setDraft('channel-3', 'Draft 3')

      expect(store.getDraft('channel-1')).toBe('Draft 1')
      expect(store.getDraft('channel-2')).toBe('Draft 2')
      expect(store.getDraft('channel-3')).toBe('Draft 3')
    })
  })

  describe('clearDraft', () => {
    it('should remove draft from memory and localStorage', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Test draft')
      store.clearDraft('channel-1')

      expect(store.getDraft('channel-1')).toBe('')
      expect(localStorage.getItem('fluffwire-draft:channel-1')).toBeNull()
    })

    it('should not affect other channel drafts', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Draft 1')
      store.setDraft('channel-2', 'Draft 2')

      store.clearDraft('channel-1')

      expect(store.getDraft('channel-1')).toBe('')
      expect(store.getDraft('channel-2')).toBe('Draft 2')
    })
  })

  describe('clearDraftsForChannel', () => {
    it('should clear draft for deleted channel', () => {
      const store = useDraftsStore()
      store.setDraft('channel-1', 'Test draft')
      store.clearDraftsForChannel('channel-1')

      expect(store.getDraft('channel-1')).toBe('')
      expect(localStorage.getItem('fluffwire-draft:channel-1')).toBeNull()
    })
  })

  describe('localStorage persistence', () => {
    it('should persist across store instances', () => {
      const store1 = useDraftsStore()
      store1.setDraft('channel-1', 'Persistent draft')

      // Create new pinia and store instance
      setActivePinia(createPinia())
      const store2 = useDraftsStore()

      expect(store2.getDraft('channel-1')).toBe('Persistent draft')
    })

    it('should use correct localStorage key format', () => {
      const store = useDraftsStore()
      store.setDraft('test-channel-123', 'Test')

      const key = 'fluffwire-draft:test-channel-123'
      expect(localStorage.getItem(key)).toBe('Test')
    })
  })
})
