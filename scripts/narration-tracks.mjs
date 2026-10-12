#!/usr/bin/env node
// Narration track list for one module, with a hash of each track's text.
// Library: import { hashedTracks } from './narration-tracks.mjs'
// CLI (used by scripts/tts.py): node scripts/narration-tracks.mjs src/content/modules/01-what-insurance-is.json
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { moduleTracks } from '../src/lib/narration.ts'

export const hashedTracks = (m) =>
  moduleTracks(m).map((t) => ({ ...t, hash: createHash('sha256').update(t.text, 'utf8').digest('hex') }))

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const path = process.argv[2]
  if (!path) { console.error('usage: node scripts/narration-tracks.mjs <module.json>'); process.exit(2) }
  console.log(JSON.stringify(hashedTracks(JSON.parse(readFileSync(path, 'utf8')))))
}
