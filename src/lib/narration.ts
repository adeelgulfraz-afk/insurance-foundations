import { parseInline, parseMarkdown } from './markdown.ts'
import type { Module } from '../types.ts'

export interface Track { file: string; title: string; text: string }

/** Trim and make sure the text reads as a full sentence (so the voice pauses). */
const sentence = (s: string): string => {
  const t = s.trim()
  return /[.!?:;]["')\]]?$/.test(t) ? t : `${t}.`
}

const plain = (s: string): string => parseInline(s).map((i) => i.text).join('')

/** Markdown subset -> plain prose. Paragraph breaks become blank lines, which the voice treats as pauses. */
export function flattenMarkdown(md: string): string {
  const out: string[] = []
  for (const b of parseMarkdown(md)) {
    if (b.type === 'p') out.push(sentence(plain(b.text)))
    // "### 1. Notification" would read back as a list marker; "1: Notification" keeps the number.
    else if (b.type === 'h3') out.push(sentence(plain(b.text).replace(/^(\d+)\.\s+/, '$1: ')))
    else for (const item of b.items) out.push(sentence(plain(item)))
  }
  return out.join('\n\n')
}

/** Narration tracks in reading order. File names are stable: 00 recap, 01..N sections, N+1 why it matters. */
export function moduleTracks(m: Pick<Module, 'recap' | 'sections' | 'whyItMatters'>): Track[] {
  const why = 'Why this matters for a broker'
  const items = [
    { title: 'Quick recap', text: m.recap.map(sentence).join('\n\n') },
    ...m.sections.map((s) => ({ title: s.heading, text: `${sentence(s.heading)}\n\n${flattenMarkdown(s.body)}` })),
    { title: why, text: `${sentence(why)}\n\n${sentence(m.whyItMatters)}` },
  ]
  return items.map((t, i) => ({ file: `${String(i).padStart(2, '0')}.mp3`, ...t }))
}
