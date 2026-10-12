# Insurance Foundations — built for Poppy

A small study app that gives Poppy a plain-English grounding in insurance and the UK market, at roughly CII IF1 level, with an overview of health and protection insurance. Twelve short modules, each with a reading and a 10-question quiz (8/10 unlocks the next), then a 100-question final exam. It's built for a phone and keeps progress in the browser. No accounts, no backend.

## Run locally

Needs Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Checks

```bash
npm run validate   # content rules (see below); fails on any error
npm test           # unit tests for the pure logic in src/lib
npm run typecheck
npm run build      # validate + typecheck + production build into dist/
npm run preview    # serve dist/ locally
```

## Deploy (GitHub Pages)

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: install, validate, test, build, deploy. If the first run went red because Pages wasn't switched on yet, open the **Actions** tab and re-run it (or push again).

The site appears at `https://<owner>.github.io/<repo>/`. (A repository named `<owner>.github.io` is served from the root instead.) The asset base path comes from the repository name automatically (`GITHUB_REPOSITORY` in CI), and routes use the URL hash, so no 404 setup is needed.

## Editing content

```
src/content/
  modules/NN-slug.json   # one file per module, NN = 01..12
  exam-extra.json        # { "questions": [...] } cross-module exam questions
```

Each module file has `id` (`m01`…`m12`), `order` (1–12, matching the filename and id), `title`, `estimatedMinutes`, `recap` (exactly 5 bullets), `sections` (4–6, each `{ "heading", "body" }`), `whyItMatters` (one or two sentences for brokers) and `questions` (exactly 30).

Section bodies use a small markdown subset — nothing else is allowed:

- paragraphs separated by a blank line
- `### ` sub-headings
- `- ` bullets and `1. ` numbered items
- `**bold**` and `*italic*`

No links, tables, code, quotes, images or HTML. All section bodies in a module must total 1,600–2,400 words.

Check a single module while you work on it:

```bash
node scripts/validate.mjs --file src/content/modules/05-fair-presentation-and-good-faith.json
```

Run `npm run validate` for the whole set before committing.

All content JSON is bundled into the app's single JavaScript file (about 680 kB, 210 kB gzipped). That's fine for this app, so `vite.config.ts` raises Vite's chunk-size warning limit to 800 kB instead of code-splitting. If the content grows past that, the build will warn again.

## Narration (listen to a module)

Each module page has a player that reads the recap, every section and "why this matters" in a natural British voice. The audio is generated once, by hand, on a Mac and committed under `public/audio/<moduleId>/` (one MP3 per part plus `hashes.json`). Nothing runs at build time and nothing costs money.

One-off setup (Kokoro needs Python 3.12; Python 3.14 is too new for its dependencies at the time of writing):

```bash
brew install espeak-ng python@3.12 ffmpeg
"$(brew --prefix python@3.12)/bin/python3.12" -m venv .venv && .venv/bin/pip install kokoro soundfile
```

Then, after editing any module text:

```bash
.venv/bin/python scripts/tts.py          # all modules; only re-records parts whose text changed
.venv/bin/python scripts/tts.py m05      # one module
```

`npm run validate` warns (it does not fail) when a module's narration is missing or out of date, naming the part to re-record. The voice is Kokoro's `bf_emma`; change `VOICE` in `scripts/tts.py` and delete `public/audio` to re-record everything with another voice.

## Adding questions

Every question has this shape:

```json
{
  "id": "m05-q07",
  "topic": "careless misrepresentation",
  "stem": "Poppy's friend forgot to mention a previous claim when buying home cover…",
  "options": ["…", "…", "…", "…"],
  "answerIndex": 2,
  "explanation": "One or two sentences that teach why the answer is right."
}
```

Rules (the validator enforces most of them):

- Exactly 4 options and exactly one correct answer; `answerIndex` is 0–3.
- No "all of the above" / "none of the above".
- Options are shuffled on screen, so explanations must not refer to letters or positions.
- Spread the correct position: each `answerIndex` value should be correct 4–12 times per module.
- Every question needs a `topic` and an explanation that teaches.
- Exactly 30 questions per module, ids `mNN-q01`…`mNN-q30`, no repeated stems.
- Cross-module questions go in `exam-extra.json` with ids `x-q01`, `x-q02`… and `"module": "mixed"`.
- The exam bank (all module questions plus the extras, de-duplicated by stem) must hold at least 250 distinct questions.

## Progress data

Progress lives in the browser's `localStorage` under the key `poppy-insurance-progress-v1`. On the **Progress** page (`#/progress`) you can copy an export code and paste it into Import on another device to carry progress across. An exam that's partway through stays on the device it was started on. "Reset everything" clears all progress on that device.
