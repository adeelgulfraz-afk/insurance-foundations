# Module Narration (TTS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each module's reading page gets a "Listen" player that plays pre-generated, natural-sounding British narration of the recap, every section and "why this matters", with per-section jump buttons and lock-screen support on iPhone.

**Architecture:** One pure TypeScript module (`src/lib/narration.ts`) turns a module JSON into an ordered track list (file name, title, plain-prose text). It is shared by three consumers: the app (titles and file names for the player), the content validator (staleness warning via text hashes), and a Python script that synthesises each track with Kokoro and encodes MP3s with ffmpeg into `public/audio/<id>/`. The MP3s are committed and served as static files; the app plays them with a native `<audio>` element.

**Tech Stack:** React 19, TypeScript, Vite 8, Node 24 (`node --test`, native TS type stripping), Python 3 + Kokoro (`hexgrad/Kokoro-82M`, voice `bf_emma`) + soundfile + ffmpeg, Homebrew `espeak-ng`.

**Spec:** `docs/superpowers/specs/2026-10-12-module-narration-design.md`

## Global Constraints

- Voice: Kokoro `bf_emma`, `lang_code='b'`, speed 1.0.
- MP3: mono, 24 kHz, 48 kbps, at `public/audio/<moduleId>/<nn>.mp3`, `nn` zero-padded from `00`.
- Track order: `00` = "Quick recap", `01..N` = sections in order, `N+1` = "Why this matters for a broker".
- Hash: SHA-256 hex of the exact UTF-8 track text, recorded in `public/audio/<moduleId>/hashes.json` as `{ "<nn>.mp3": "<hex>" }`.
- Generation runs only on the author's Mac. `.github/workflows/deploy.yml` is not changed.
- The validator **warns** (never errors) on missing or stale narration.
- Flattened text contains no `#`, no `*`, and no line starting with `- ` or `N. `.
- Asset URLs use `import.meta.env.BASE_URL` (GitHub Pages sub-path).
- Tap targets at least 44 px (existing app rule). Reuse `.btn`, `.btn-ghost`, `.card`, `.eyebrow` from `src/styles.css`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Deviation from spec, deliberately: the spec said the Python script has a `--selftest` and the validator reimplements the flattening in JS. Instead there is a single TS implementation, tested with `node --test`, and Python asks Node for the track list. One implementation, nothing to keep in lockstep.

## Review Focus

1. A sentence that ends in a closing quote or bracket after its full stop (e.g. `…"the end."`) must not get a second full stop appended. Pinned in Task 1 test `sentence punctuation`.
2. A real module body must flatten to prose with no leftover markdown anywhere, across all twelve modules. Pinned in Task 1 test `real modules flatten clean`.
3. Editing a module's text after audio was generated must produce a validator warning that names the module and the stale file, and `npm run validate` must still exit 0. Pinned in Task 2 step 7 (scripted check).
4. When the last track ends the player must stop cleanly: no loop, no exception, index unchanged. Pinned in Task 4 browser check.
5. Tapping a section's play button while another track is playing must switch to that track and play it from the start. Pinned in Task 4 browser check.

---

### Task 1: Narration track list (pure lib + tests)

**Files:**
- Create: `src/lib/narration.ts`
- Create: `src/lib/narration.test.ts`

**Interfaces:**
- Consumes: `parseMarkdown`, `parseInline` from `src/lib/markdown.ts`; `Module` from `src/types.ts`.
- Produces:
  ```ts
  export interface Track { file: string; title: string; text: string }
  export function flattenMarkdown(md: string): string
  export function moduleTracks(m: Pick<Module, 'recap' | 'sections' | 'whyItMatters'>): Track[]
  ```
  `file` is `"00.mp3"`, `"01.mp3"`, … in reading order.

- [ ] **Step 1: Write the failing tests**

`src/lib/narration.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './narration.ts'`.

- [ ] **Step 3: Implement**

`src/lib/narration.ts`:
```ts
import { parseInline, parseMarkdown } from './markdown'
import type { Module } from '../types'

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
    if (b.type === 'p' || b.type === 'h3') out.push(sentence(plain(b.text)))
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
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all tests PASS (including the existing ones), typecheck clean. If `real modules flatten clean` fails on a specific module, inspect that body: the fix belongs in `flattenMarkdown` (the markdown subset is fixed by the validator), not in the content.

- [ ] **Step 5: Commit**

```bash
git add src/lib/narration.ts src/lib/narration.test.ts
git commit -m "feat: narration track list from module content

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Track CLI for Python and validator staleness warning

**Files:**
- Create: `scripts/narration-tracks.mjs`
- Modify: `scripts/validate.mjs` (imports at top; whole-set branch after `const mods = …`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `moduleTracks` from `src/lib/narration.ts`.
- Produces:
  - `scripts/narration-tracks.mjs` exports `hashedTracks(module) => { file, title, text, hash }[]` (hash = SHA-256 hex of `text`).
  - CLI: `node scripts/narration-tracks.mjs <path/to/module.json>` prints that array as JSON on stdout. Task 3's Python script calls this.

- [ ] **Step 1: Write the CLI module**

`scripts/narration-tracks.mjs`:
```js
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
```

- [ ] **Step 2: Run the CLI**

Run: `node scripts/narration-tracks.mjs src/content/modules/01-what-insurance-is.json | node -e 'const t=JSON.parse(require("fs").readFileSync(0));console.log(t.length, t[0].file, t[0].title, t[0].hash.length)'`
Expected: a count of 6 to 8, `00.mp3 Quick recap 64`.

- [ ] **Step 3: Add the validator warning**

In `scripts/validate.mjs`, add to the imports at the top:
```js
import { hashedTracks } from './narration-tracks.mjs'
```
Then in the whole-set branch (the `else` of `if (fileArg)`), right after `const mods = files.map(...).filter(Boolean)`, add:
```js
  // Narration is generated by hand (python3 scripts/tts.py). Warn, never fail, when it is missing or stale.
  for (const m of mods) {
    const dir = join(root, 'public/audio', m.id)
    const hp = join(dir, 'hashes.json')
    const hint = `run: python3 scripts/tts.py ${m.id}`
    if (!existsSync(hp)) { warn(`${m.id}: no narration audio (${hint})`); continue }
    let hashes = {}
    try { hashes = JSON.parse(readFileSync(hp, 'utf8')) } catch { warn(`${m.id}: hashes.json is not valid JSON (${hint})`); continue }
    const stale = hashedTracks(m).filter((t) => hashes[t.file] !== t.hash || !existsSync(join(dir, t.file))).map((t) => t.file)
    if (stale.length) warn(`${m.id}: narration stale or missing for ${stale.join(', ')} (${hint})`)
  }
```

- [ ] **Step 4: Run the validator with no audio present**

Run: `npm run validate; echo "exit $?"`
Expected: twelve `⚠ mNN: no narration audio (run: python3 scripts/tts.py mNN)` lines, then `✔ content is valid`, `exit 0`.

- [ ] **Step 5: Confirm `--file` mode is untouched**

Run: `node scripts/validate.mjs --file src/content/modules/01-what-insurance-is.json`
Expected: `✔ 01-what-insurance-is.json is valid` with no narration warnings.

- [ ] **Step 6: Ignore the Python venv**

Append to `.gitignore`:
```
.venv
```

- [ ] **Step 7: Scripted staleness check (Review Focus 3)**

Run:
```bash
mkdir -p public/audio/m01 && node scripts/narration-tracks.mjs src/content/modules/01-what-insurance-is.json \
  | node -e 'const t=JSON.parse(require("fs").readFileSync(0));const h={};for(const x of t)h[x.file]=x.hash;require("fs").writeFileSync("public/audio/m01/hashes.json",JSON.stringify(h))' \
  && for f in $(node -e 'console.log(Object.keys(JSON.parse(require("fs").readFileSync("public/audio/m01/hashes.json"))).join(" "))'); do : > public/audio/m01/$f; done \
  && npm run validate 2>&1 | grep -c 'm01:' ; \
  sed -i '' 's/"whyItMatters": "/"whyItMatters": "Edited. /' src/content/modules/01-what-insurance-is.json \
  && npm run validate 2>&1 | grep 'm01:' ; \
  git checkout src/content/modules/01-what-insurance-is.json && rm -rf public/audio/m01
```
Expected: first grep prints `0` (fresh hashes and files present, no m01 warning); second prints one line naming the last track file, e.g. `⚠ m01: narration stale or missing for 07.mp3 (run: python3 scripts/tts.py m01)`. The last line restores the module and removes the temporary folder. Confirm `git status` shows only the intended files.

- [ ] **Step 8: Commit**

```bash
git add scripts/narration-tracks.mjs scripts/validate.mjs .gitignore
git commit -m "feat: narration track CLI and validator staleness warning

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Generation script, environment setup, first module

**Files:**
- Create: `scripts/tts.py`
- Create (generated): `public/audio/m01/00.mp3` … `public/audio/m01/<N+1>.mp3`, `public/audio/m01/hashes.json`

**Interfaces:**
- Consumes: `node scripts/narration-tracks.mjs <module.json>` → JSON `[{ file, title, text, hash }]`.
- Produces: MP3s and `hashes.json` per the Global Constraints. Later tasks only need the files to exist.

- [ ] **Step 1: Set up the Python environment**

Run:
```bash
brew list espeak-ng >/dev/null 2>&1 || brew install espeak-ng
python3 -m venv .venv && .venv/bin/pip install --quiet kokoro soundfile
.venv/bin/python -c "import kokoro, soundfile; print('ok')"
```
Expected: `ok`. If `pip install kokoro` fails because PyTorch has no wheel for Python 3.14, use Homebrew's Python 3.12 instead: `brew install python@3.12 && rm -rf .venv && $(brew --prefix python@3.12)/bin/python3.12 -m venv .venv && .venv/bin/pip install --quiet kokoro soundfile`, and note that in the README text in Step 6. The first run downloads the model (about 330 MB) into the Hugging Face cache; that is expected.

- [ ] **Step 2: Write the generator**

`scripts/tts.py`:
```python
#!/usr/bin/env python3
"""Generate module narration with Kokoro (voice bf_emma) into public/audio/<id>/.

Setup (once, on the Mac):
    brew install espeak-ng
    python3 -m venv .venv && .venv/bin/pip install kokoro soundfile
Usage:
    .venv/bin/python scripts/tts.py            # all modules, skipping tracks whose text is unchanged
    .venv/bin/python scripts/tts.py m03 m07    # just those modules
Track text and file names come from `node scripts/narration-tracks.mjs`, the same code the app and
validator use, so the three never disagree.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "src/content/modules"
OUT = ROOT / "public/audio"
VOICE = "bf_emma"


def tracks(module_path: Path) -> list[dict]:
    raw = subprocess.check_output(["node", str(ROOT / "scripts/narration-tracks.mjs"), str(module_path)])
    return json.loads(raw)


def to_mp3(audio, sample_rate: int, dest: Path) -> None:
    import soundfile as sf
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        sf.write(wav.name, audio, sample_rate)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-ac", "1", "-ar", "24000", "-b:a", "48k", str(dest)],
            check=True,
        )


def main(only: set[str]) -> None:
    import numpy as np
    from kokoro import KPipeline

    pipe = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    for path in sorted(MODULES.glob("*.json")):
        module = json.loads(path.read_text())
        mid = module["id"]
        if only and mid not in only:
            continue
        out = OUT / mid
        out.mkdir(parents=True, exist_ok=True)
        hashes_path = out / "hashes.json"
        hashes = json.loads(hashes_path.read_text()) if hashes_path.exists() else {}
        wanted = tracks(path)
        keep = {t["file"] for t in wanted} | {"hashes.json"}
        for stray in out.iterdir():          # module shrank: drop files no track owns
            if stray.name not in keep:
                stray.unlink()
                hashes.pop(stray.name, None)
        for t in wanted:
            mp3 = out / t["file"]
            if hashes.get(t["file"]) == t["hash"] and mp3.exists():
                continue
            print(f"{mid}/{t['file']}  {t['title']}", flush=True)
            chunks = []
            for _graphemes, _phonemes, audio in pipe(t["text"], voice=VOICE, speed=1.0):
                chunks.append(audio.numpy() if hasattr(audio, "numpy") else np.asarray(audio))
            to_mp3(np.concatenate(chunks), 24000, mp3)
            hashes[t["file"]] = t["hash"]
            hashes_path.write_text(json.dumps(hashes, indent=2) + "\n")   # after every track: safe to interrupt
    print("done")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
```

- [ ] **Step 3: Generate module 1**

Run: `.venv/bin/python scripts/tts.py m01`
Expected: one progress line per track (recap, each section, why it matters), then `done`. Takes a few minutes on Apple Silicon.

- [ ] **Step 4: Check the output**

Run:
```bash
ls -la public/audio/m01 && cat public/audio/m01/hashes.json \
  && for f in public/audio/m01/*.mp3; do printf '%s ' "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"; done \
  && npm run validate 2>&1 | grep -c 'm01:'
```
Expected: an MP3 per track plus `hashes.json`; every duration between about 20 s and 6 min; total folder under 10 MB; the final grep prints `0` (no m01 warning). Listen to one file: `afplay public/audio/m01/01.mp3` for ten seconds and stop it with Ctrl-C. It should be a natural British female voice reading the first section, with no spoken asterisks or hashes.

- [ ] **Step 5: Re-run proves it is incremental**

Run: `.venv/bin/python scripts/tts.py m01`
Expected: only `done`, in under a few seconds.

- [ ] **Step 6: Document in README**

In `README.md`, add a section after "Editing content" (before "Adding questions"):
```markdown
## Narration (listen to a module)

Each module page has a player that reads the recap, every section and "why this matters" in a natural British voice. The audio is generated once, by hand, on a Mac and committed under `public/audio/<moduleId>/` (one MP3 per part plus `hashes.json`). Nothing runs at build time and nothing costs money.

One-off setup:

```bash
brew install espeak-ng
python3 -m venv .venv && .venv/bin/pip install kokoro soundfile
```

Then, after editing any module text:

```bash
.venv/bin/python scripts/tts.py          # all modules; only re-records parts whose text changed
.venv/bin/python scripts/tts.py m05      # one module
```

`npm run validate` warns (it does not fail) when a module's narration is missing or out of date, naming the part to re-record. The voice is Kokoro's `bf_emma`; change `VOICE` in `scripts/tts.py` and delete `public/audio` to re-record everything with another voice.
```
If Step 1 needed Python 3.12, replace the `python3 -m venv .venv` line in the README with the Python 3.12 command used.

- [ ] **Step 7: Commit**

```bash
git add scripts/tts.py public/audio/m01 README.md
git commit -m "feat: Kokoro narration generator, module 1 audio

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Player component and module page integration

**Files:**
- Create: `src/components/AudioPlayer.tsx`
- Modify: `src/pages/ModuleRead.tsx` (the rendered `return` block, lines 54–77)
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `moduleTracks`, `Track` from `src/lib/narration.ts`; `import.meta.env.BASE_URL`.
- Produces:
  ```tsx
  export default function AudioPlayer(props: {
    tracks: Track[]; moduleId: string; moduleTitle: string; index: number; playKey: number; onSelect: (i: number) => void
  }): JSX.Element
  ```
  `index` is the current track; `playKey` increments every time the parent wants playback to start (so selecting the same track again still plays); `onSelect(i)` is called for previous/next/auto-advance and the parent is expected to bump `playKey`.

- [ ] **Step 1: Write the player**

`src/components/AudioPlayer.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import type { Track } from '../lib/narration'

interface Props {
  tracks: Track[]
  moduleId: string
  moduleTitle: string
  index: number
  /** Bumped by the parent whenever playback should start (also when re-selecting the current track). */
  playKey: number
  onSelect: (i: number) => void
}

export default function AudioPlayer({ tracks, moduleId, moduleTitle, index, playKey, onSelect }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const t = tracks[index]
  const last = tracks.length - 1

  // Start playing when the parent asks (section button, prev/next, auto-advance). playKey 0 = page just opened: stay silent.
  useEffect(() => {
    if (playKey === 0 || !ref.current) return
    ref.current.load()
    ref.current.play().catch(() => { /* autoplay refused: the user can press play on the controls */ })
  }, [index, playKey])

  // Lock-screen title and headphone buttons on phones.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: moduleTitle, album: 'Insurance Foundations' })
    navigator.mediaSession.setActionHandler('previoustrack', index > 0 ? () => onSelect(index - 1) : null)
    navigator.mediaSession.setActionHandler('nexttrack', index < last ? () => onSelect(index + 1) : null)
  }, [index, last, moduleTitle, onSelect, t.title])

  return (
    <section className="card narration" aria-label="Listen to this module">
      <div className="narration-head">
        <button type="button" className="btn btn-ghost" onClick={() => onSelect(index - 1)} disabled={index === 0} aria-label="Previous part">‹</button>
        <div className="narration-title">
          <p className="eyebrow">Listen · part {index + 1} of {tracks.length}</p>
          <strong>{t.title}</strong>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => onSelect(index + 1)} disabled={index === last} aria-label="Next part">›</button>
      </div>
      <audio
        ref={ref}
        controls
        preload="none"
        playsInline
        src={`${import.meta.env.BASE_URL}audio/${moduleId}/${t.file}`}
        onEnded={() => { if (index < last) onSelect(index + 1) }}
      />
    </section>
  )
}
```

- [ ] **Step 2: Wire it into the module page**

In `src/pages/ModuleRead.tsx`:

Add imports:
```tsx
import { useEffect, useState } from 'react'
import AudioPlayer from '../components/AudioPlayer'
import { moduleTracks } from '../lib/narration'
```
(replace the existing `import { useEffect } from 'react'`).

Inside `ModuleRead`, after `const open = ...`, add:
```tsx
  const [track, setTrack] = useState(0)
  const [playKey, setPlayKey] = useState(0)
  const listen = (i: number) => { setTrack(i); setPlayKey((k) => k + 1) }
```
Hooks must stay above the early `return`s, which they are.

Replace the rendered block from `<p className="muted">` through the `callout` section with:
```tsx
      <p className="muted">~{m.estimatedMinutes} min read</p>

      <AudioPlayer tracks={tracks} moduleId={m.id} moduleTitle={m.title} index={track} playKey={playKey} onSelect={listen} />

      <section className="card recap">
        <h2>Quick recap <PlayButton label="Quick recap" onClick={() => listen(0)} /></h2>
        <ul>{m.recap.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </section>

      {m.sections.map((s, i) => (
        <article key={i}>
          <h2>{s.heading} <PlayButton label={s.heading} onClick={() => listen(i + 1)} /></h2>
          <Markdown body={s.body} />
        </article>
      ))}

      <section className="card callout">
        <p className="eyebrow">Why this matters for a broker <PlayButton label="Why this matters for a broker" onClick={() => listen(tracks.length - 1)} /></p>
        <p>{m.whyItMatters}</p>
      </section>
```
where `const tracks = moduleTracks(m)` is declared just before the `return` (after the `if (!m)` / `if (!open)` guards, since `m` is narrowed there), and `PlayButton` is a small component at the bottom of the same file:
```tsx
function PlayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="btn-play" aria-label={`Listen to ${label}`} onClick={onClick}>▶</button>
}
```

- [ ] **Step 3: Styles**

Append to `src/styles.css`:
```css
/* Narration player and per-section play buttons */
.narration-head { display: flex; align-items: center; gap: 10px; }
.narration-head .btn { min-width: 44px; padding: 10px 0; font-size: 1.3rem; line-height: 1; }
.narration-title { flex: 1; min-width: 0; }
.narration-title strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.narration audio { display: block; width: 100%; margin-top: 12px; }
.btn-play {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px; margin-left: 6px; vertical-align: middle;
  border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--accent);
  font-size: 0.8rem; cursor: pointer;
}
.btn-play:hover { border-color: var(--accent); }
.eyebrow .btn-play { min-height: 32px; min-width: 32px; }
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck && npm run build 2>&1 | tail -5`
Expected: clean typecheck; build succeeds (validate warnings for modules 2–12 are expected at this point). Then: `grep -o 'audio/[^"]*' dist/assets/*.js | head -2` prints a template string containing `audio/` (confirms the URL is built, not hard-coded).

- [ ] **Step 5: Browser verification**

Start the dev server with the Browser pane (`preview_start`, name from `.claude/launch.json`; create it with `npm run dev` on port 5173 if absent). Open `#/module/m01`. Check, with `read_console_messages` showing no errors:
1. The "Listen · part 1 of N" card shows under the read-time line with "Quick recap" and native audio controls.
2. Press play on the native controls: a network request for `audio/m01/00.mp3` returns 200 and audio plays (`javascript_tool`: `document.querySelector('audio').paused === false`).
3. Press a section's ▶ button: the title changes to that heading and the element's `src` ends in the matching `0N.mp3`, `paused` is false, `currentTime` restarted near 0 (Review Focus 5).
4. Simulate the end of a track (`javascript_tool`: `a=document.querySelector('audio'); a.currentTime=a.duration-0.2`) and wait 2 s: title advances to the next part and `paused` is false.
5. Select the last part and simulate its end: title stays on the last part, `paused` is true, no console error, no loop (Review Focus 4).
6. `resize_window` to mobile: the head row fits on one line, buttons are at least 44 px tall (`getBoundingClientRect`), no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`). Switch `colorScheme` to dark and confirm the card and buttons are legible.
Take a screenshot of the module page at mobile width for the final report.

- [ ] **Step 6: Commit**

```bash
git add src/components/AudioPlayer.tsx src/pages/ModuleRead.tsx src/styles.css
git commit -m "feat: module narration player with per-section play buttons

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Generate audio for modules 2 to 12 and commit

**Files:**
- Create (generated): `public/audio/m02/` … `public/audio/m12/`

**Interfaces:**
- Consumes: `scripts/tts.py` from Task 3.

- [ ] **Step 1: Generate**

Run: `.venv/bin/python scripts/tts.py` (no args: all modules, m01 is skipped as up to date). Expect roughly 30–60 minutes on Apple Silicon; the script prints each track as it starts. It may be run in the background while Task 4 proceeds.

- [ ] **Step 2: Verify**

Run:
```bash
npm run validate 2>&1 | grep -c '⚠' ; du -sh public/audio ; ls public/audio | wc -l ; find public/audio -name '*.mp3' | wc -l
```
Expected: `0` warnings, total size roughly 50–90 MB, 12 folders, 70–100 MP3s. Spot-listen ten seconds of one track from a late module, e.g. `afplay public/audio/m12/02.mp3`.

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | tail -3 && du -sh dist`
Expected: build succeeds with no narration warnings; `dist` includes `audio/`.

- [ ] **Step 4: Commit**

```bash
git add public/audio
git commit -m "content: narration audio for modules 2-12

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes

- Spec coverage: §1 generation → Tasks 3 and 5; §2 player → Task 4; §3 validator → Task 2; §4 testing → Tasks 1, 2 (step 7), 4 (step 5). README from spec §1 → Task 3 step 6. The spec's Python `--selftest` and JS reimplementation are replaced by one TS implementation plus Node CLI (see Global Constraints, last line).
- Type consistency: `Track { file, title, text }` (Task 1) is extended with `hash` only in the CLI output (Task 2) and consumed as such by Python (Task 3). `AudioPlayer` props `{ tracks, moduleId, moduleTitle, index, playKey, onSelect }` match the usage in Task 4 step 2.
- Review Focus items 1–5 each name the task and step that pins them.
