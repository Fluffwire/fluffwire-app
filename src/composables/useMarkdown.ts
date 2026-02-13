import { marked, type RendererObject } from 'marked'
import DOMPurify from 'dompurify'

const renderer: RendererObject = {
  // Flatten paragraphs to avoid <p> wrapping for chat messages
  paragraph({ tokens }) {
    return this.parser.parseInline(tokens) + '<br>'
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

export function renderMarkdown(content: string): string {
  const raw = marked.parse(content, { async: false }) as string
  const clean = DOMPurify.sanitize(raw.trim(), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
  // Ensure links open in new tabs
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
}
