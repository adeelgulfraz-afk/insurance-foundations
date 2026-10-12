import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flattenMarkdown, moduleTracks } from './narration.ts'

test('flattenMarkdown turns the markdown subset into prose', () => {
  const md = 'Intro with **bold** and *it*.\nsame para.\n\n### Heading\n\n- one\n- two already.\n\n1. first\n2. second?\n\nLast'
  assert.equal(
    flattenMarkdown(md),
    'Intro with bold and it. same para.\n\nHeading.\n\none.\n\ntwo already.\n\nfirst.\n\nsecond?\n\nLast.',
  )
})

test('sentence punctuation', () => {
  assert.equal(flattenMarkdown('He said "the end."'), 'He said "the end."')
  assert.equal(flattenMarkdown('Ends with a bracket (like this.)'), 'Ends with a bracket (like this.)')
  assert.equal(flattenMarkdown('Examples include:'), 'Examples include:')
  assert.equal(flattenMarkdown('No stop'), 'No stop.')
  assert.equal(flattenMarkdown('### 1. Notification'), '1: Notification.')
})

test('moduleTracks orders recap, sections, why it matters', () => {
  const t = moduleTracks({
    recap: ['A', 'B!'],
    sections: [{ heading: 'H', body: 'Body' }, { heading: 'H2', body: 'More.' }],
    whyItMatters: 'W.',
  })
  assert.deepEqual(t.map((x) => [x.file, x.title]), [
    ['00.mp3', 'Quick recap'],
    ['01.mp3', 'H'],
    ['02.mp3', 'H2'],
    ['03.mp3', 'Why this matters for a broker'],
  ])
  assert.equal(t[0].text, 'A.\n\nB!')
  assert.equal(t[1].text, 'H.\n\nBody.')
  assert.equal(t[3].text, 'Why this matters for a broker.\n\nW.')
})

test('real modules flatten clean', () => {
  const dir = join(import.meta.dirname, '../content/modules')
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const m = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    for (const t of moduleTracks(m)) {
      assert.ok(t.text.length > 20, `${f} ${t.file} is empty`)
      assert.doesNotMatch(t.text, /[#*]/, `${f} ${t.file} has markup`)
      assert.doesNotMatch(t.text, /^(- |\d+\. )/m, `${f} ${t.file} has a list marker`)
    }
  }
})
