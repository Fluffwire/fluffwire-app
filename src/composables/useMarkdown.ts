import { marked, type RendererObject } from 'marked'
import DOMPurify from 'dompurify'

const emoticonMap: [RegExp, string][] = [
  // Discord-style shortcodes with related aliases
  [/:thumbsup:|:thumbs_up:|:thumb_up:|:\+1:|:like:|:approve:|:yes:|:agree:/gi, '👍'],
  [/:thumbsdown:|:thumbs_down:|:thumb_down:|:-1:|:dislike:|:disapprove:|:no:|:disagree:/gi, '👎'],
  [/:fire:|:hot:|:lit:|:flame:|:burn:|:awesome:/gi, '🔥'],
  [/:100:|:hundred:|:perfect:|:full:|:score:/gi, '💯'],
  [/:tada:|:party:|:celebrate:|:congrats:|:celebration:|:confetti:/gi, '🎉'],
  [/:shrug:|:idk:|:dunno:|:whatever:|:meh:/gi, '🤷'],
  [/:salute:|:respect:|:sir:|:captain:/gi, '🫡'],
  [/:thinking:|:think:|:hmm:|:wonder:|:ponder:|:question:/gi, '🤔'],
  [/:joy:|:laugh:|:happy:|:lol:/gi, '😂'],
  [/:rofl:|:lmao:|:rolling:|:laughing:|:dead:/gi, '🤣'],
  [/:sob:|:cry:|:crying:|:tears:|:sad:|:weep:/gi, '😭'],
  [/:eyes:|:eye_roll:|:roll:|:annoyed:|:ugh:/gi, '🙄'],
  [/:muscle:|:flex:|:strong:|:power:|:strength:|:bicep:/gi, '💪'],
  [/:pray:|:please:|:thanks:|:grateful:|:namaste:|:bless:/gi, '🙏'],
  [/:raised_hands:|:yay:|:hooray:|:praise:|:celebrate:|:hands:/gi, '🙌'],
  [/:angry:|:mad:|:rage:|:furious:|:upset:/gi, '😠'],
  // Text emoticons - ORDER MATTERS! More specific patterns FIRST
  // Note: >:( is handled with replaceAll in the function, not here
  // IMPORTANT: Use word boundaries to avoid matching inside URLs
  [/(?<=^|\s):D(?=\s|$)/g, '😃'],       // Must be before :)
  [/(?<=^|\s):P(?=\s|$)/gi, '😛'],      // Must be before :)
  [/(?<=^|\s);\)(?=\s|$)/g, '😉'],      // Must be before :)
  [/(?<=^|\s)B\)(?=\s|$)/g, '😎'],      // Must be before :)
  [/(?<=^|\s):\)(?=\s|$)/g, '😊'],      // After all other :-variations
  [/(?<=^|\s):\((?=\s|$)/g, '😞'],
  [/(?<=^|\s):\/(?=\s|$)/g, '😕'],      // CRITICAL: Must not match in URLs!
  [/(?<=^|\s)<3(?=\s|$)/g, '❤️'],
  [/(?<=^|\s):o(?=\s|$)/gi, '😮'],
  [/(?<=^|\s)XD(?=\s|$)/gi, '😆'],
]

function replaceEmoticons(text: string): string {
  // Don't replace inside code blocks/spans
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (i % 2 === 1) return part // code block, skip

    // Replace >:( FIRST with string replacement to avoid regex issues
    if (part.includes('>:(')) {
      console.log('[EMOJI DEBUG] Found >:( in text, replacing with 😠')
      part = part.split('>:(').join('😠')
      console.log('[EMOJI DEBUG] After replacement:', part)
    }

    for (const [pattern, emoji] of emoticonMap) {
      part = part.replace(pattern, emoji)
    }
    return part
  }).join('')
}

const renderer: RendererObject = {
  // Flatten paragraphs to avoid <p> wrapping for chat messages
  paragraph({ tokens }) {
    return this.parser.parseInline(tokens) + '<br><br>'
  },
  heading({ text }) {
    return text + '\n'
  },
  hr() {
    return '---\n'
  },
  blockquote({ tokens }) {
    return this.parser.parse(tokens)
  },
}

marked.use({
  renderer,
  breaks: true,
  gfm: true,
})

// Configure DOMPurify to only allow safe inline tags
const ALLOWED_TAGS = ['strong', 'em', 'del', 'code', 'pre', 'a', 'br']
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

function highlightMentions(html: string): string {
  // Match @username that is NOT inside an HTML tag attribute or code block
  // Only match at word boundaries in text content
  return html.replace(
    /(?<![<\w])@(\w{1,32})(?![^<]*>)/g,
    '<span class="mention">@$1</span>'
  )
}

export function renderMarkdown(content: string): string {
  const raw = marked.parse(replaceEmoticons(content), { async: false }) as string
  const clean = DOMPurify.sanitize(raw.trim(), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
  // Trim trailing <br> tags from paragraph rendering
  const trimmed = clean.replace(/(<br>)+$/, '')
  // Highlight @mentions (post-sanitization, so spans are safe)
  const withMentions = highlightMentions(trimmed)
  // Ensure links open in new tabs
  return withMentions.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
}
