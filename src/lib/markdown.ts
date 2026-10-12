export type Inline = { text: string; bold?: boolean; italic?: boolean }
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

/** Parses the validator-enforced subset: blank-line paragraphs, "### ", "- ", "1. ". */
export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = [] } }
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (line.startsWith('### ')) { flush(); blocks.push({ type: 'h3', text: line.slice(4).trim() }); continue }
    if (line.startsWith('- ')) {
      flush()
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.items.push(line.slice(2).trim())
      else blocks.push({ type: 'ul', items: [line.slice(2).trim()] })
      continue
    }
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ol) {
      flush()
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ol') last.items.push(ol[1].trim())
      else blocks.push({ type: 'ol', items: [ol[1].trim()] })
      continue
    }
    para.push(line)
  }
  flush()
  return blocks
}

/** Splits **bold** and *italic* runs. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let i = 0
  for (const m of text.matchAll(re)) {
    if (m.index > i) out.push({ text: text.slice(i, m.index) })
    if (m[1] !== undefined) out.push({ text: m[1], bold: true })
    else out.push({ text: m[2], italic: true })
    i = m.index + m[0].length
  }
  if (i < text.length) out.push({ text: text.slice(i) })
  return out.length ? out : [{ text: '' }]
}
