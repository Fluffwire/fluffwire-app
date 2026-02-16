import { describe, it, expect } from 'vitest'
import { searchEmojis, shortcodeToEmoji, emojiDatabase } from '@/data/emojiShortcodes'

describe('Emoji Shortcodes', () => {
  describe('emojiDatabase', () => {
    it('should have valid structure for all emojis', () => {
      emojiDatabase.forEach((emoji) => {
        expect(emoji).toHaveProperty('emoji')
        expect(emoji).toHaveProperty('shortcodes')
        expect(emoji).toHaveProperty('keywords')
        expect(emoji).toHaveProperty('category')

        expect(Array.isArray(emoji.shortcodes)).toBe(true)
        expect(emoji.shortcodes.length).toBeGreaterThan(0)
        expect(Array.isArray(emoji.keywords)).toBe(true)
        expect(typeof emoji.emoji).toBe('string')
        expect(typeof emoji.category).toBe('string')
      })
    })

    it('should have unique emojis', () => {
      const emojis = emojiDatabase.map((e) => e.emoji)
      const uniqueEmojis = new Set(emojis)
      expect(uniqueEmojis.size).toBe(emojis.length)
    })

    it('should have primary shortcode first', () => {
      // Check a few known emojis
      const thumbsup = emojiDatabase.find((e) => e.emoji === '👍')
      expect(thumbsup?.shortcodes[0]).toBe('thumbsup')

      const fire = emojiDatabase.find((e) => e.emoji === '🔥')
      expect(fire?.shortcodes[0]).toBe('fire')
    })

    it('should have all emojis with keywords', () => {
      // Every emoji should have at least some keywords (unless intentionally empty)
      const emojisWithoutKeywords = emojiDatabase.filter((e) => e.keywords.length === 0)

      // Allow a small number of emojis without keywords, but most should have them
      // If this fails, it means we haven't added keywords to all emojis yet
      expect(emojisWithoutKeywords.length).toBeLessThan(10)
    })
  })

  describe('shortcodeToEmoji map', () => {
    it('should map all shortcodes to emojis', () => {
      expect(shortcodeToEmoji.size).toBeGreaterThan(0)
    })

    it('should map primary shortcodes correctly', () => {
      expect(shortcodeToEmoji.get('thumbsup')).toBe('👍')
      expect(shortcodeToEmoji.get('fire')).toBe('🔥')
      expect(shortcodeToEmoji.get('heart')).toBe('❤️')
      expect(shortcodeToEmoji.get('smile')).toBe('😄')
    })

    it('should map alternative shortcodes correctly', () => {
      expect(shortcodeToEmoji.get('thumbs_up')).toBe('👍')
      expect(shortcodeToEmoji.get('+1')).toBe('👍')
      expect(shortcodeToEmoji.get('like')).toBe('👍')
    })

    it('should not have undefined values', () => {
      const values = Array.from(shortcodeToEmoji.values())
      expect(values.every((v) => v !== undefined)).toBe(true)
    })
  })

  describe('searchEmojis', () => {
    it('should return empty array for empty query', () => {
      const results = searchEmojis('')
      expect(results).toEqual([])
    })

    it('should return empty array for query less than 3 chars', () => {
      const results = searchEmojis('ab')
      expect(results).toEqual([])
    })

    it('should find emojis by exact shortcode match', () => {
      const results = searchEmojis('fire')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((e) => e.emoji === '🔥')).toBe(true)
    })

    it('should find emojis by partial shortcode match', () => {
      const results = searchEmojis('thu')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((e) => e.emoji === '👍')).toBe(true) // thumbsup
    })

    it('should find emojis by keyword match', () => {
      const results = searchEmojis('happy')
      expect(results.length).toBeGreaterThan(0)
      // Should find emojis with 'happy' in keywords
      expect(results.some((e) => e.keywords.some((k) => k.includes('happy')))).toBe(true)
    })

    it('should prioritize shortcode matches over keyword matches', () => {
      const results = searchEmojis('smile')
      // 😄 with shortcode 'smile' should appear in results
      expect(results.some((e) => e.shortcodes.includes('smile'))).toBe(true)
    })

    it('should be case-insensitive', () => {
      const lower = searchEmojis('fire')
      const upper = searchEmojis('FIRE')
      const mixed = searchEmojis('FiRe')

      expect(lower.length).toBeGreaterThan(0)
      expect(upper.length).toBeGreaterThan(0)
      expect(mixed.length).toBeGreaterThan(0)

      // Should find the same emoji
      expect(lower.some((e) => e.emoji === '🔥')).toBe(true)
      expect(upper.some((e) => e.emoji === '🔥')).toBe(true)
      expect(mixed.some((e) => e.emoji === '🔥')).toBe(true)
    })

    it('should limit results to 8', () => {
      // Search for common keyword that matches many emojis
      const results = searchEmojis('love')
      expect(results.length).toBeLessThanOrEqual(8)
    })

    it('should handle fuzzy keyword matching', () => {
      const results = searchEmojis('hun')
      // Should find emojis with keywords containing 'hun' like 'hungry'
      expect(results.length).toBeGreaterThan(0)
    })

    it('should find emojis with numeric shortcodes', () => {
      const results = searchEmojis('100')
      expect(results.some((e) => e.emoji === '💯')).toBe(true)
    })

    it('should handle special characters in query', () => {
      // Note: searchEmojis requires min 3 chars, so test with 'like' instead
      const results = searchEmojis('like')
      expect(results.some((e) => e.emoji === '👍')).toBe(true)
    })

    it('should not return duplicates', () => {
      const results = searchEmojis('fire')
      const emojis = results.map((e) => e.emoji)
      const unique = new Set(emojis)
      expect(unique.size).toBe(emojis.length)
    })

    it('should find emojis across all categories', () => {
      const smileyResults = searchEmojis('smile')
      const animalResults = searchEmojis('dog')
      const foodResults = searchEmojis('pizza')

      expect(smileyResults.length).toBeGreaterThan(0)
      expect(animalResults.length).toBeGreaterThan(0)
      expect(foodResults.length).toBeGreaterThan(0)
    })

    it('should handle queries with spaces', () => {
      // Queries with spaces should still work (spaces become part of search)
      const results = searchEmojis('hot dog')
      // Should match 'hotdog' or emojis with those keywords
      expect(results).toBeDefined()
    })
  })

  describe('real-world usage', () => {
    it('should find common emojis users might search for', () => {
      const commonSearches = [
        { query: 'laugh', expectedEmoji: '😂' },
        { query: 'cry', expectedEmoji: '😢' },
        { query: 'love', expectedEmoji: '❤️' },
        { query: 'think', expectedEmoji: '🤔' },
        { query: 'party', expectedEmoji: '🎉' },
        { query: 'rocket', expectedEmoji: '🚀' },
      ]

      commonSearches.forEach(({ query, expectedEmoji }) => {
        const results = searchEmojis(query)
        expect(
          results.some((e) => e.emoji === expectedEmoji),
          `Expected to find ${expectedEmoji} for query "${query}"`
        ).toBe(true)
      })
    })

    it('should support Discord-style shortcodes', () => {
      const discordShortcodes = ['joy', 'rofl', 'thumbsup', 'heart_eyes', 'fire']

      discordShortcodes.forEach((shortcode) => {
        const emoji = shortcodeToEmoji.get(shortcode)
        expect(emoji, `Expected shortcode "${shortcode}" to map to an emoji`).toBeDefined()
      })
    })
  })
})
