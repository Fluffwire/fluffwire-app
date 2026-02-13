import { marked, type RendererObject } from 'marked'
import DOMPurify from 'dompurify'

const emoticonMap: [RegExp, string][] = [
  [/(?<=^|[\s]):\)(?=$|[\s])/g, '😊'],
  [/(?<=^|[\s]):\((?=$|[\s])/g, '😞'],
  [/(?<=^|[\s]);\)(?=$|[\s])/g, '😉'],
  [/(?<=^|[\s])<3(?=$|[\s])/g, '❤️'],
  [/(?<=^|[\s]):D(?=$|[\s])/g, '😃'],
  [/(?<=^|[\s]):P(?=$|[\s])/g, '😛'],
  [/(?<=^|[\s]):\/(?=$|[\s])/g, '😕'],
  [/(?<=^|[\s]):o(?=$|[\s])/gi, '😮'],
  [/(?<=^|[\s])XD(?=$|[\s])/gi, '😆'],
  [/(?<=^|[\s])B\)(?=$|[\s])/g, '😎'],
]

function replaceEmoticons(text: string): string {
  // Don't replace inside code blocks/spans
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (i % 2 === 1) return part // code block, skip
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
