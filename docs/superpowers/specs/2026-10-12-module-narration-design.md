# Module narration (text-to-speech) design

Date: 2026-10-12

## Goal

A learner can tap play on a module's reading page and hear it read aloud in a
natural British voice, on a phone, with the screen off, like a podcast.
Constraints: zero running cost, no paid services, must sound human rather than
monotone, phone-first.

## Decision

Pre-generate audio once on the author's Mac with Kokoro (open-source,
Apache-licensed neural TTS, voice `bf_emma`), commit the MP3s, serve them as
static files from GitHub Pages, play them with a native HTML audio element.
Rejected: browser Web Speech API (robotic iOS voices, stops on screen lock),
in-browser neural models (large download, slow on phones), paid APIs.

## 1. Generation script: `scripts/tts.py`

Run by hand on the Mac, never in CI.

- Usage: `python3 scripts/tts.py [m01 m02 ...]` (no args = all modules);
  `python3 scripts/tts.py --selftest` runs the flattening asserts.
- Setup (documented in README): `brew install espeak-ng`,
  `pip3 install kokoro soundfile`; ffmpeg already present.
- For each module JSON in `src/content/modules/`, build the track list in
  reading order:
  1. "Quick recap": the five recap strings joined as sentences.
  2. One track per section: heading, then body flattened to prose.
  3. "Why this matters for a broker": the `whyItMatters` string.
- Flattening the markdown subset (see `src/lib/markdown.ts` and
  `scripts/validate.mjs` for the allowed syntax): `### ` headings become a
  sentence on their own; `- ` and `1. ` list items become sentences;
  `**bold**` and `*italic*` markers are removed; blank lines separate
  paragraphs. Output must contain no `#`, `*`, or leading `- `.
- Synthesis: Kokoro pipeline with `lang_code='b'`, voice `bf_emma`, speed 1.0;
  concatenate the generated chunks; encode via ffmpeg to mono MP3, 24 kHz,
  48 kbps, at `public/audio/<moduleId>/<nn>.mp3` where `nn` is the
  zero-padded track index (`00` recap, `01..N` sections, `N+1` why it matters).
- Incremental: `public/audio/<moduleId>/hashes.json` maps `<nn>.mp3` to the
  SHA-256 of the exact text synthesised. A track is skipped when its hash
  matches and the MP3 exists. Stale extra files (module shrank) are deleted.
- Expected size: roughly three hours of audio, about 65 MB total, committed.

## 2. Player: `src/components/AudioPlayer.tsx`

Used by `src/pages/ModuleRead.tsx`.

- Props: `tracks: { title: string; src: string }[]`, `moduleTitle: string`,
  and a way for section play buttons to select a track (component exposes
  `play(index)` via a small shared state in `ModuleRead`, or the buttons are
  rendered by the player; implementer's choice, keep it minimal).
- One native `<audio controls preload="none" playsInline>` element. Above it,
  the current track title with previous and next buttons. On `ended`, advance
  to the next track and keep playing; stop after the last.
- Each section `<h2>` in `ModuleRead` gets a small play button that selects
  that track and starts playback.
- Media Session API (`navigator.mediaSession.metadata`, when available) is set
  to the track title and module title so the iPhone lock screen shows it;
  `previoustrack`/`nexttrack` handlers map to the buttons.
- Sources are `${import.meta.env.BASE_URL}audio/${moduleId}/${nn}.mp3` so the
  GitHub Pages sub-path works. The track list is derived from the module
  structure; no manifest is read by the app.
- Placed directly under the "~N min read" line. Styling reuses existing
  `.btn` classes and the card look in `src/styles.css`; tap targets at least
  44 px, consistent with the rest of the app.

## 3. Validator guardrail: `scripts/validate.mjs`

When running the whole content set (not `--file` mode), for each module:
warn (never error) if `public/audio/<id>/hashes.json` is missing, or if any
track's expected hash differs from the recorded one, or a listed MP3 is
missing. The expected hash must be computed from the same flattening rules as
the Python script; the validator reimplements the flattening in JS (small) and
the two implementations are kept in lockstep by a shared fixture: the
`--selftest` asserts and a node test in `src/lib/` or `scripts/` use the same
input/expected pairs.

## 4. Testing and verification

- `python3 scripts/tts.py --selftest` asserts the flattening on a handful of
  inputs (heading, bullets, numbered list, bold/italic, multi-paragraph).
- A node test covers the JS flattening with the same pairs.
- Manual verification: `npm run build` passes; dev server shows the player on
  a module; pressing play works; a track ending advances to the next; section
  buttons jump; editing a module body and running `npm run validate` prints
  the staleness warning.

## Out of scope

Quiz narration, playback speed control, a player that persists across pages,
CI generation of audio, voice selection UI.
