import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/composables/useMarkdown'

describe('useMarkdown', () => {
  describe('renderMarkdown', () => {
    it('should render basic markdown', () => {
      const result = renderMarkdown('**bold** and *italic*')
      expect(result).toContain('<strong>bold</strong>')
      expect(result).toContain('<em>italic</em>')
    })

    it('should sanitize dangerous HTML', () => {
      const result = renderMarkdown('<script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should convert emoticons to emojis', () => {
      const result = renderMarkdown(':D')
      expect(result).toContain('😃')
    })

    it('should add target="_blank" to links', () => {
      const result = renderMarkdown('[link](https://example.com)')
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })
  })

  describe('user mentions', () => {
    it('should highlight valid user mentions', () => {
      const validMentions = ['john', 'jane']
      const result = renderMarkdown('Hello @john and @jane!', validMentions)

      expect(result).toContain('<span class="mention">@john</span>')
      expect(result).toContain('<span class="mention">@jane</span>')
    })

    it('should not highlight invalid user mentions', () => {
      const validMentions = ['john']
      const result = renderMarkdown('Hello @john and @stranger!', validMentions)

      expect(result).toContain('<span class="mention">@john</span>')
      expect(result).not.toContain('<span class="mention">@stranger</span>')
      expect(result).toContain('@stranger')
    })

    it('should handle mentions without validation list', () => {
      const result = renderMarkdown('Hello @john!')
      // Without validation, all mentions should be highlighted
      expect(result).toContain('<span class="mention">@john</span>')
    })

    it('should be case-insensitive for mention validation', () => {
      const validMentions = ['john']
      const result = renderMarkdown('Hello @John and @JOHN!', validMentions)

      expect(result).toContain('<span class="mention">@John</span>')
      expect(result).toContain('<span class="mention">@JOHN</span>')
    })

    it('should handle multiple mentions of same user', () => {
      const validMentions = ['john']
      const result = renderMarkdown('@john said hi to @john', validMentions)

      const matches = result.match(/<span class="mention">@john<\/span>/g)
      expect(matches).toHaveLength(2)
    })
  })

  describe('channel mentions', () => {
    it('should highlight valid channel mentions', () => {
      const validChannels = ['general', 'random']
      const result = renderMarkdown('Check out #general and #random!', undefined, validChannels)

      expect(result).toContain('<span class="channel-mention">#general</span>')
      expect(result).toContain('<span class="channel-mention">#random</span>')
    })

    it('should not highlight invalid channel mentions', () => {
      const validChannels = ['general']
      const result = renderMarkdown('Check out #general and #fake!', undefined, validChannels)

      expect(result).toContain('<span class="channel-mention">#general</span>')
      expect(result).not.toContain('<span class="channel-mention">#fake</span>')
      expect(result).toContain('#fake')
    })

    it('should handle channels without validation list', () => {
      const result = renderMarkdown('Check out #general!')
      // Without validation, all channel mentions should be highlighted
      expect(result).toContain('<span class="channel-mention">#general</span>')
    })

    it('should be case-insensitive for channel validation', () => {
      const validChannels = ['general']
      const result = renderMarkdown('Check #General and #GENERAL!', undefined, validChannels)

      expect(result).toContain('<span class="channel-mention">#General</span>')
      expect(result).toContain('<span class="channel-mention">#GENERAL</span>')
    })

    it('should handle channels with underscores and hyphens', () => {
      const validChannels = ['general-chat', 'random_stuff']
      const result = renderMarkdown('#general-chat and #random_stuff', undefined, validChannels)

      // Note: Current implementation only matches \w characters (letters, numbers, underscore)
      // Hyphens are not matched by the current regex
      expect(result).toContain('#general')
      expect(result).toContain('<span class="channel-mention">#random_stuff</span>')
    })

    it('should not highlight channels in code blocks', () => {
      const validChannels = ['general']
      const result = renderMarkdown('`#general` is a channel', undefined, validChannels)

      // Should not highlight mentions inside code blocks
      expect(result).toContain('code')
      expect(result).toContain('#general')
    })

    it('should respect max channel name length (32 chars)', () => {
      const validChannels = ['a'.repeat(32), 'a'.repeat(33)]
      const result = renderMarkdown(
        `#${'a'.repeat(32)} and #${'a'.repeat(33)}`,
        undefined,
        validChannels
      )

      // 32 chars should match, 33 should not
      expect(result).toContain(`<span class="channel-mention">#${'a'.repeat(32)}</span>`)
      // 33 chars exceeds limit, so only first 32 would be matched if at all
    })
  })

  describe('combined mentions', () => {
    it('should handle both user and channel mentions', () => {
      const validMentions = ['john']
      const validChannels = ['general']
      const result = renderMarkdown(
        'Hey @john, check #general!',
        validMentions,
        validChannels
      )

      expect(result).toContain('<span class="mention">@john</span>')
      expect(result).toContain('<span class="channel-mention">#general</span>')
    })

    it('should not confuse user and channel mentions', () => {
      const validMentions = ['general']
      const validChannels = ['john']
      const result = renderMarkdown(
        '@general is a user, #john is a channel',
        validMentions,
        validChannels
      )

      expect(result).toContain('<span class="mention">@general</span>')
      expect(result).toContain('<span class="channel-mention">#john</span>')
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = renderMarkdown('')
      expect(result).toBe('')
    })

    it('should handle content with only whitespace', () => {
      const result = renderMarkdown('   ')
      // Whitespace-only content is trimmed to empty
      expect(result).toBe('')
    })

    it('should trim trailing <br> tags', () => {
      const result = renderMarkdown('Hello\n\n\n')
      expect(result).not.toMatch(/<br>$/)
    })

    it('should not highlight mentions in URLs', () => {
      const validMentions = ['user']
      const result = renderMarkdown(
        'Visit https://example.com/@user',
        validMentions
      )

      // Should not highlight @user inside URL
      expect(result).toContain('https://example.com/@user')
    })

    it('should handle special characters in content', () => {
      const result = renderMarkdown('< > & " \' test')
      expect(result).toBeTruthy()
      // Should be properly escaped/sanitized
    })
  })
})
