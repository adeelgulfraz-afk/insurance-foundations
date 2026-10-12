import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdown, parseInline } from './markdown.ts'

test('paragraphs, headings and lists', () => {
  const md = 'First para\nstill first.\n\n### A heading\n\n- one\n- two\n\n1. a\n2. b\n\nLast.'
  assert.deepEqual(parseMarkdown(md), [
    { type: 'p', text: 'First para still first.' },
    { type: 'h3', text: 'A heading' },
    { type: 'ul', items: ['one', 'two'] },
    { type: 'ol', items: ['a', 'b'] },
    { type: 'p', text: 'Last.' },
  ])
})

test('inline bold and italic', () => {
  assert.deepEqual(parseInline('a **bold** and *it* end'), [
    { text: 'a ' }, { text: 'bold', bold: true }, { text: ' and ' }, { text: 'it', italic: true }, { text: ' end' },
  ])
  assert.deepEqual(parseInline('plain'), [{ text: 'plain' }])
})
