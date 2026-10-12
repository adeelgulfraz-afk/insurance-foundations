# Insurance Foundations (for Poppy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first, static, GitHub-Pages-deployable study app: 12 IF1-level insurance modules (reading + randomised 10-question quiz, pass 8/10, sequential unlock) and a 100-question final exam (pass 70%, per-module breakdown), progress in localStorage with export/import.

**Architecture:** Vite + React 19 + TypeScript, no backend. Content is JSON under `src/content/` validated by `scripts/validate.mjs` (fails the build). Pure logic (shuffle/draw/score, progress store, hash router, tiny markdown subset) lives in `src/lib/*.ts` and is unit-tested with Node's built-in test runner (Node 24 strips types natively, so no vitest). Pages are thin React views over that logic. Plain CSS with variables and `prefers-color-scheme` dark mode. Hash routing so Pages needs no 404 trick.

**Tech Stack:** vite, react, react-dom, typescript, @vitejs/plugin-react, @types/react, @types/react-dom. Nothing else. Node ≥ 24 (for `node --test` with TypeScript type-stripping).

**Spec:** `docs/superpowers/specs/2026-10-12-brief.md` (the build brief). Read it before any task; it is the authority on tone, content, and behaviour.

## Global Constraints

- Header on the home screen is exactly: **"Insurance Foundations — built for Poppy"**.
- Dependencies: only the seven packages listed in Tech Stack. Do not add a router, markdown, test, or UI library.
- Mobile-first, designed at 375px; body text ≥ 16px (use 17px), line-height ≥ 1.6, tap targets ≥ 44px, dark mode via `prefers-color-scheme`.
- Routes (hash): `#/` home, `#/module/:id` reading, `#/module/:id/quiz`, `#/exam`, `#/exam/results`, `#/progress`.
- localStorage key: `poppy-insurance-progress-v1`, shape exactly as in the brief (`version: 1`).
- Quiz: 10 drawn at random from the module's 30; options shuffled; pass mark 8/10; unlimited retries; fresh draw each retry; can't change a submitted answer; instant feedback with explanation; aria-live feedback.
- Exam: unlocked only when all 12 passed; 100 drawn from a bank ≥ 250 distinct (dedupe on normalised stem); pass 70%; untimed but shows elapsed; flag-for-review + review grid; autosaves in-progress attempt; results by module; unlimited retakes.
- Content: 12 modules, each 4–6 sections, 1,600–2,400 words across section bodies, 5-bullet recap, one "why this matters for a broker" note, exactly 30 questions (4 options, exactly one correct, no "all/none of the above", plausible distractors, varied correct position, teaching explanation, `topic` tag). All content original; relaxed, warm, plain English, for Poppy (NHS dietitian), everyday + clinical analogies. UK law current as of 2026: Insurance Act 2015, CIDRA 2012, Consumer Duty in force, FCA conduct / PRA prudential.
- Markdown subset in section bodies (enforced by validator): paragraphs separated by blank lines, `### ` sub-headings, `- ` bullets, `1. ` numbered items, `**bold**`, `*italic*`. Nothing else (no links, tables, code, blockquotes, images, HTML).
- No confetti, no sound. One-line encouragement on pass.
- Deployment: `.github/workflows/deploy.yml` builds on push to `main` and deploys with `actions/deploy-pages`; Vite `base` from `GITHUB_REPOSITORY` in CI, `/` locally.
- Do not write a repo name into content. Package name is `insurance-foundations`.
- Commit after each task with a conventional message.

## Review Focus

Failure modes the brief implies but no single feature spells out. Each has a pinned test in the owning task.

1. **Corrupt or foreign localStorage value** (old key format, truncated JSON, wrong version): app must still open at home with empty progress, never a white screen. → Task 4 `load()` test.
2. **Garbage pasted into Import** (not base64, base64 of non-JSON, JSON of the wrong shape): show an error, leave existing progress untouched. → Task 4 `importProgress()` test.
3. **Exam resumed after a closed tab** must show the same 100 questions, same option order, same answers and flags, and the timer must not count the time the tab was closed. → Task 5 `applyOrder` round-trip test; Task 9 manual check.
4. **A question that exists in both a module bank and exam-extra (same normalised stem)** must appear once in the exam bank, and per-module totals on the results screen must sum to 100. → Task 5 `buildExamBank` + `score` tests.
5. **Unknown or malformed hash** (`#/module/`, `#/module/m99`, `#/foo`, `#module/m01` without slash): render a friendly not-found with a link home, never crash. → Task 3 `parseHash` test; Task 7 ModuleRead handles unknown id.

---

## File Structure

```
insurance-foundations/
├── .github/workflows/deploy.yml      # build + deploy to Pages
├── .gitignore
├── README.md                         # run, deploy, edit content, add questions
├── index.html                        # viewport, theme-color, title, root div
├── package.json                      # scripts: dev, validate, test, typecheck, build, preview
├── tsconfig.json
├── vite.config.ts                    # base from GITHUB_REPOSITORY
├── scripts/validate.mjs              # content validator (whole set, or --file one module)
├── docs/superpowers/{specs,plans}/   # brief + this plan
└── src/
    ├── main.tsx                      # mount <App/>
    ├── App.tsx                       # route switch + <Layout/>
    ├── styles.css                    # variables, dark mode, components
    ├── types.ts                      # Module, Question, BankQuestion, DrawnQuestion
    ├── content/
    │   ├── index.ts                  # loads modules via import.meta.glob, builds examBank
    │   ├── modules/NN-slug.json      # 12 files (Task 10)
    │   └── exam-extra.json           # { "questions": [...] } (Task 11)
    ├── lib/                          # pure, node-testable; relative imports use .ts extension
    │   ├── shuffle.ts  (+ .test.ts)  # Fisher–Yates, mulberry32 seeded rng
    │   ├── questions.ts (+ .test.ts) # normaliseStem, buildExamBank, applyOrder, draw, score
    │   ├── progress.ts (+ .test.ts)  # types, load/save/coerce, export/import, unlock rules, recordQuizResult
    │   ├── router.ts   (+ .test.ts)  # parseHash, navigate
    │   └── markdown.ts (+ .test.ts)  # parseMarkdown -> blocks
    ├── hooks/
    │   ├── useProgress.ts            # useSyncExternalStore over progress store
    │   └── useRoute.ts               # useSyncExternalStore over hashchange
    ├── components/
    │   ├── Layout.tsx                # header bar + back link + <main>
    │   ├── Markdown.tsx              # renders blocks from parseMarkdown
    │   ├── ProgressRing.tsx          # SVG ring, passed/12
    │   ├── QuestionCard.tsx          # stem + 4 option buttons; feedback mode or exam mode
    │   └── ModuleListItem.tsx        # locked / available / passed + best score
    └── pages/
        ├── Home.tsx
        ├── ModuleRead.tsx
        ├── ModuleQuiz.tsx
        ├── Exam.tsx
        ├── ExamResults.tsx
        ├── ProgressPage.tsx
        └── NotFound.tsx
```

---

## Stage 1 — Scaffold (one agent, Tasks 1–9)

### Task 1: Project skeleton, config, deploy workflow

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.github/workflows/deploy.yml`, `src/main.tsx`, `src/App.tsx` (placeholder), `src/styles.css` (placeholder), `.nvmrc`

**Interfaces:**
- Produces: npm scripts `dev`, `validate`, `test`, `typecheck`, `build`, `preview`.

- [ ] **Step 1: git init and package.json**

```bash
git init -b main
```

`package.json`:
```json
{
  "name": "insurance-foundations",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "vite",
    "validate": "node scripts/validate.mjs",
    "test": "node --test \"src/lib/*.test.ts\"",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "build": "npm run validate && npm run typecheck && vite build",
    "preview": "vite preview"
  }
}
```

Then install exact deps (this pins versions in package.json and creates package-lock.json, which CI's `npm ci` needs):
```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "vite.config.ts"]
}
```
Note: `"types": ["node"]` needs `@types/node`; if `tsc` complains, run `npm i -D @types/node` (it's a type-only dev dep; allowed). `erasableSyntaxOnly` guarantees Node can strip types in `src/lib` (no enums, no parameter properties, no namespaces).

- [ ] **Step 3: vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GITHUB_REPOSITORY is "owner/repo" in Actions. A user/org site (repo named
// owner.github.io) is served from "/", every other repo from "/repo/".
function pagesBase(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (!repo || repo.endsWith('.github.io')) return '/'
  return `/${repo}/`
}

export default defineConfig({
  plugins: [react()],
  base: pagesBase(),
})
```

- [ ] **Step 4: index.html, main.tsx, placeholder App, .gitignore, .nvmrc**

`index.html`:
```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#0f766e" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0b3d3a" media="(prefers-color-scheme: dark)" />
    <title>Insurance Foundations</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` placeholder: `export default function App() { return <h1>Insurance Foundations — built for Poppy</h1> }`.

`.gitignore`: `node_modules`, `dist`, `.DS_Store`. `.nvmrc`: `24`.

- [ ] **Step 5: deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run validate
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Verify dev build works with placeholder**

Run: `npm run typecheck && npx vite build` (not `npm run build` yet — validator doesn't exist). Expected: `dist/` produced, no errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite react ts project with pages workflow"
```

---

### Task 2: Types and content validator

**Files:**
- Create: `src/types.ts`, `scripts/validate.mjs`

**Interfaces:**
- Produces: `Question`, `BankQuestion`, `Module`, `DrawnQuestion` types; `node scripts/validate.mjs` (whole set) and `node scripts/validate.mjs --file src/content/modules/05-x.json` (single module, skips cross-file checks). Exit 1 on any error.

- [ ] **Step 1: src/types.ts**

```ts
export interface Question {
  id: string          // "m01-q01" … "m12-q30" for modules, "x-q01"… for exam-extra
  topic: string       // short tag, e.g. "peril vs hazard"
  stem: string
  options: string[]   // exactly 4
  answerIndex: number // 0..3
  explanation: string // 1–2 sentences that teach
}

/** A question that knows which module it belongs to ("m01".."m12" or "mixed"). */
export interface BankQuestion extends Question {
  module: string
}

/** A bank question whose options have been permuted for display. order[i] = original index of the option now at position i. */
export interface DrawnQuestion extends BankQuestion {
  order: number[]
}

export interface Section {
  heading: string
  body: string // markdown subset
}

export interface Module {
  id: string            // "m01"
  order: number         // 1..12
  title: string
  estimatedMinutes: number
  recap: string[]       // exactly 5
  sections: Section[]   // 4..6
  whyItMatters: string
  questions: Question[] // exactly 30
}
```

- [ ] **Step 2: scripts/validate.mjs**

```js
#!/usr/bin/env node
// Content validator. Usage:
//   node scripts/validate.mjs                      # whole content set (used by build/CI)
//   node scripts/validate.mjs --file <module.json> # one module only, skips cross-file checks
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const modulesDir = join(root, 'src/content/modules')
const extraPath = join(root, 'src/content/exam-extra.json')
const argv = process.argv.slice(2)
const fileArg = argv.includes('--file') ? argv[argv.indexOf('--file') + 1] : null

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const BANNED_OPTION = /\b(all|none|both) of the above\b/i
export const normaliseStem = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const wordCount = (s) => s.replace(/[*_#]/g, ' ').split(/\s+/).filter(Boolean).length
const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min

function checkMarkdown(where, body) {
  const lines = body.split('\n')
  lines.forEach((line, i) => {
    const at = `${where} line ${i + 1}`
    if (/^#/.test(line) && !/^### \S/.test(line)) err(`${at}: only "### " sub-headings are allowed`)
    if (/^(>|\||```|\* |\+ )/.test(line)) err(`${at}: blockquotes, tables, code and "* " bullets are not allowed`)
    if (/\]\(|`|<[a-z]+>|!\[/i.test(line)) err(`${at}: links, code, images and HTML are not allowed`)
    if (/^- $|^\d+\. $/.test(line)) err(`${at}: empty list item`)
  })
}

function checkQuestion(q, where, expectIdPrefix) {
  if (!isStr(q.id) || !new RegExp(`^${expectIdPrefix}-q\\d{2}$`).test(q.id)) err(`${where}: id must match ${expectIdPrefix}-qNN (got ${JSON.stringify(q.id)})`)
  if (!isStr(q.topic)) err(`${where}: topic is required`)
  if (!isStr(q.stem, 20)) err(`${where}: stem must be at least 20 characters`)
  if (!Array.isArray(q.options) || q.options.length !== 4) err(`${where}: must have exactly 4 options`)
  else {
    q.options.forEach((o, i) => {
      if (!isStr(o)) err(`${where}: option ${i} is empty`)
      else if (BANNED_OPTION.test(o)) err(`${where}: option ${i} uses "all/none of the above"`)
    })
    if (new Set(q.options.map((o) => normaliseStem(String(o)))).size !== 4) err(`${where}: options must be distinct`)
  }
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) err(`${where}: answerIndex must be 0..3`)
  if (!isStr(q.explanation, 30)) err(`${where}: explanation must be at least 30 characters`)
}

function checkModule(path) {
  const name = basename(path)
  let m
  try { m = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { err(`${name}: invalid JSON (${e.message})`); return null }
  const w = name
  if (!/^m\d{2}$/.test(m.id ?? '')) err(`${w}: id must be mNN`)
  if (!Number.isInteger(m.order) || m.order < 1 || m.order > 12) err(`${w}: order must be 1..12`)
  if (m.id && m.order && Number(m.id.slice(1)) !== m.order) err(`${w}: id ${m.id} does not match order ${m.order}`)
  if (!new RegExp(`^${String(m.order).padStart(2, '0')}-[a-z0-9-]+\\.json$`).test(name)) err(`${w}: filename must be NN-slug.json matching order`)
  if (!isStr(m.title)) err(`${w}: title is required`)
  if (!Number.isFinite(m.estimatedMinutes) || m.estimatedMinutes < 5 || m.estimatedMinutes > 60) err(`${w}: estimatedMinutes must be 5..60`)
  if (!Array.isArray(m.recap) || m.recap.length !== 5 || !m.recap.every((r) => isStr(r))) err(`${w}: recap must be exactly 5 non-empty strings`)
  if (!isStr(m.whyItMatters, 20)) err(`${w}: whyItMatters is required`)
  if (!Array.isArray(m.sections) || m.sections.length < 4 || m.sections.length > 6) err(`${w}: must have 4..6 sections`)
  else {
    let words = 0
    m.sections.forEach((s, i) => {
      if (!isStr(s.heading)) err(`${w}: section ${i + 1} needs a heading`)
      if (!isStr(s.body, 100)) err(`${w}: section ${i + 1} body is too short`)
      else { words += wordCount(s.body); checkMarkdown(`${w} section ${i + 1}`, s.body) }
    })
    if (words < 1600 || words > 2400) err(`${w}: body word count ${words} is outside 1600..2400`)
  }
  if (!Array.isArray(m.questions) || m.questions.length !== 30) err(`${w}: must have exactly 30 questions (got ${m.questions?.length ?? 0})`)
  else {
    const stems = new Map()
    const counts = [0, 0, 0, 0]
    m.questions.forEach((q, i) => {
      checkQuestion(q, `${w} question ${i + 1} (${q.id ?? 'no id'})`, m.id ?? 'mNN')
      if (Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex <= 3) counts[q.answerIndex]++
      const n = normaliseStem(String(q.stem ?? ''))
      if (stems.has(n)) err(`${w}: question ${i + 1} duplicates stem of question ${stems.get(n)}`)
      stems.set(n, i + 1)
    })
    counts.forEach((c, i) => { if (c < 4 || c > 12) err(`${w}: answerIndex ${i} is correct ${c} times; keep each position between 4 and 12 of 30`) })
    const ids = new Set(m.questions.map((q) => q.id))
    if (ids.size !== m.questions.length) err(`${w}: duplicate question ids`)
  }
  return m
}

if (fileArg) {
  checkModule(resolve(fileArg))
} else {
  const files = existsSync(modulesDir) ? readdirSync(modulesDir).filter((f) => f.endsWith('.json')).sort() : []
  if (files.length !== 12) err(`expected 12 module files in src/content/modules, found ${files.length}`)
  const mods = files.map((f) => checkModule(join(modulesDir, f))).filter(Boolean)
  const orders = new Set(mods.map((m) => m.order))
  if (orders.size !== mods.length) err('module orders are not unique')
  const ids = new Set(mods.map((m) => m.id))
  if (ids.size !== mods.length) err('module ids are not unique')

  let extra = []
  if (!existsSync(extraPath)) err('src/content/exam-extra.json is missing')
  else {
    try {
      const x = JSON.parse(readFileSync(extraPath, 'utf8'))
      extra = Array.isArray(x.questions) ? x.questions : []
      if (extra.length < 30) err(`exam-extra.json should hold ~40 cross-module questions, found ${extra.length}`)
      extra.forEach((q, i) => {
        checkQuestion(q, `exam-extra question ${i + 1} (${q.id ?? 'no id'})`, 'x')
        if (q.module !== 'mixed') err(`exam-extra question ${i + 1}: module must be "mixed"`)
      })
    } catch (e) { err(`exam-extra.json: invalid JSON (${e.message})`) }
  }

  const all = [...mods.flatMap((m) => m.questions), ...extra]
  const allIds = new Set(all.map((q) => q.id))
  if (allIds.size !== all.length) err('question ids are not unique across the whole bank')
  const distinct = new Set(all.map((q) => normaliseStem(String(q.stem ?? '')))).size
  if (distinct < 250) err(`exam bank has ${distinct} distinct stems after dedupe; need at least 250`)
  else console.log(`exam bank: ${distinct} distinct questions`)
}

warnings.forEach((w) => console.warn(`⚠ ${w}`))
if (errors.length) {
  errors.forEach((e) => console.error(`✖ ${e}`))
  console.error(`\n${errors.length} error(s)`)
  process.exit(1)
}
console.log(fileArg ? `✔ ${basename(fileArg)} is valid` : '✔ content is valid')
```

- [ ] **Step 3: Prove the validator rejects and accepts**

Write a throwaway good module to `src/content/modules/01-sample.json` (id m01, order 1, 5 recap items, 4 sections totalling ~1,700 words of lorem-free filler sentences, 30 questions with answerIndex spread 8/7/8/7) using a small generator one-liner in the scratchpad, run `node scripts/validate.mjs --file src/content/modules/01-sample.json` → expect `✔`. Change one `answerIndex` to 4 → expect `✖ … answerIndex must be 0..3` and exit code 1. Delete the sample afterwards (`rm src/content/modules/01-sample.json`) — real content arrives in Task 10. Keep the generator script in the scratchpad, not the repo.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts scripts/validate.mjs && git commit -m "feat: content types and validator"
```

---

### Task 3: Pure libs — shuffle, router, markdown

**Files:**
- Create: `src/lib/shuffle.ts`, `src/lib/shuffle.test.ts`, `src/lib/router.ts`, `src/lib/router.test.ts`, `src/lib/markdown.ts`, `src/lib/markdown.test.ts`

**Interfaces:**
- Produces: `shuffle<T>(arr, rng?)`, `mulberry32(seed): Rng`; `parseHash(hash): Route`, `navigate(path)`, `routePath(route)`; `parseMarkdown(md): Block[]`.
- All relative imports inside `src/lib` must use the `.ts` extension (Node type-stripping requires it; Vite accepts it).

- [ ] **Step 1: Failing tests**

`src/lib/shuffle.test.ts`:
```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shuffle, mulberry32 } from './shuffle.ts'

test('shuffle keeps every element and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8]
  const out = shuffle(input, mulberry32(1))
  assert.deepEqual([...out].sort(), input)
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8])
})

test('seeded rng is deterministic and changes order', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(42))
  const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(42))
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})
```

`src/lib/router.test.ts`:
```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHash, routePath } from './router.ts'

test('parses every route', () => {
  assert.deepEqual(parseHash(''), { name: 'home' })
  assert.deepEqual(parseHash('#/'), { name: 'home' })
  assert.deepEqual(parseHash('#'), { name: 'home' })
  assert.deepEqual(parseHash('#/module/m03'), { name: 'module', id: 'm03' })
  assert.deepEqual(parseHash('#/module/m03/'), { name: 'module', id: 'm03' })
  assert.deepEqual(parseHash('#/module/m03/quiz'), { name: 'quiz', id: 'm03' })
  assert.deepEqual(parseHash('#/exam'), { name: 'exam' })
  assert.deepEqual(parseHash('#/exam/results'), { name: 'examResults' })
  assert.deepEqual(parseHash('#/progress'), { name: 'progress' })
})

test('unknown or malformed hashes are notFound, never throw', () => {
  for (const h of ['#/foo', '#/module/', '#/module', '#module/m01', '#/module/m01/quiz/extra', '#/exam/x']) {
    assert.deepEqual(parseHash(h), { name: 'notFound' }, h)
  }
})

test('routePath round-trips', () => {
  assert.equal(routePath({ name: 'quiz', id: 'm02' }), '#/module/m02/quiz')
  assert.equal(routePath({ name: 'home' }), '#/')
})
```

`src/lib/markdown.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test` → Expected: failures (modules not found).

- [ ] **Step 3: Implement**

`src/lib/shuffle.ts`:
```ts
export type Rng = () => number

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Small seeded PRNG for tests. */
export function mulberry32(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
```

`src/lib/router.ts`:
```ts
export type Route =
  | { name: 'home' }
  | { name: 'module'; id: string }
  | { name: 'quiz'; id: string }
  | { name: 'exam' }
  | { name: 'examResults' }
  | { name: 'progress' }
  | { name: 'notFound' }

const ID = /^m\d{2}$/

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const parts = path.split('/').filter(Boolean)
  if (!path.startsWith('/') && path !== '') return { name: 'notFound' }
  if (parts.length === 0) return { name: 'home' }
  const [a, b, c] = parts
  if (a === 'module' && b && ID.test(b) && parts.length === 2) return { name: 'module', id: b }
  if (a === 'module' && b && ID.test(b) && c === 'quiz' && parts.length === 3) return { name: 'quiz', id: b }
  if (a === 'exam' && parts.length === 1) return { name: 'exam' }
  if (a === 'exam' && b === 'results' && parts.length === 2) return { name: 'examResults' }
  if (a === 'progress' && parts.length === 1) return { name: 'progress' }
  return { name: 'notFound' }
}

export function routePath(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'module': return `#/module/${r.id}`
    case 'quiz': return `#/module/${r.id}/quiz`
    case 'exam': return '#/exam'
    case 'examResults': return '#/exam/results'
    case 'progress': return '#/progress'
    case 'notFound': return '#/'
  }
}

export function navigate(path: string): void {
  window.location.hash = path
}
```

`src/lib/markdown.ts`:
```ts
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
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm test` → Expected: all pass. (If Node prints a type-stripping warning, that's fine.)

- [ ] **Step 5: Commit**

```bash
git add src/lib && git commit -m "feat: shuffle, hash router and markdown subset parser"
```

---

### Task 4: Progress store (pure)

**Files:**
- Create: `src/lib/progress.ts`, `src/lib/progress.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all exported from `src/lib/progress.ts`):
  - `STORAGE_KEY = 'poppy-insurance-progress-v1'`, `QUIZ_SIZE = 10`, `QUIZ_PASS = 8`, `EXAM_SIZE = 100`, `EXAM_PASS_FRACTION = 0.7`
  - types `ModuleProgress`, `ExamAttempt`, `ExamInProgress`, `Progress`
  - `emptyProgress(): Progress`, `coerce(unknown): Progress` (throws), `load(storage?): Progress` (never throws), `save(p, storage?)`
  - `exportProgress(p): string`, `importProgress(code): Progress` (throws `Error` with a human message)
  - `isModuleUnlocked(p, modules, id)`, `isExamUnlocked(p, modules)`, `nextModuleId(p, modules)`, `recordQuizResult(p, moduleId, score, now?)`, `recordExamAttempt(p, attempt)`
  - where `modules` is `{ id: string; order: number }[]`.

- [ ] **Step 1: Failing tests**

`src/lib/progress.test.ts`:
```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyProgress, load, save, exportProgress, importProgress, isModuleUnlocked, isExamUnlocked,
  nextModuleId, recordQuizResult, STORAGE_KEY, type Progress,
} from './progress.ts'

const mods = [{ id: 'm01', order: 1 }, { id: 'm02', order: 2 }, { id: 'm03', order: 3 }]
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } } }

test('load tolerates missing, corrupt and wrong-version values', () => {
  const s = mem()
  assert.deepEqual(load(s), emptyProgress())
  s.setItem(STORAGE_KEY, '{not json')
  assert.deepEqual(load(s), emptyProgress())
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 0, modules: {} }))
  assert.deepEqual(load(s), emptyProgress())
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modules: { m01: { passed: true, bestScore: 9, attempts: 1, lastAttemptAt: 'x' } } }))
  assert.equal(load(s).modules.m01.bestScore, 9)
  assert.deepEqual(load(s).exam, { attempts: [] })
})

test('save then load round-trips', () => {
  const s = mem()
  const p = recordQuizResult(emptyProgress(), 'm01', 8, '2026-01-01T00:00:00.000Z')
  save(p, s)
  assert.deepEqual(load(s), p)
})

test('unlock rules follow module order', () => {
  let p = emptyProgress()
  assert.equal(isModuleUnlocked(p, mods, 'm01'), true)
  assert.equal(isModuleUnlocked(p, mods, 'm02'), false)
  assert.equal(isModuleUnlocked(p, mods, 'm99'), false)
  p = recordQuizResult(p, 'm01', 7)
  assert.equal(p.modules.m01.passed, false)
  assert.equal(isModuleUnlocked(p, mods, 'm02'), false)
  p = recordQuizResult(p, 'm01', 8)
  assert.equal(p.modules.m01.passed, true)
  assert.equal(p.modules.m01.bestScore, 8)
  assert.equal(p.modules.m01.attempts, 2)
  assert.equal(isModuleUnlocked(p, mods, 'm02'), true)
  assert.equal(isExamUnlocked(p, mods), false)
  assert.equal(nextModuleId(p, mods), 'm02')
  p = recordQuizResult(recordQuizResult(p, 'm02', 10), 'm03', 9)
  assert.equal(isExamUnlocked(p, mods), true)
  assert.equal(nextModuleId(p, mods), undefined)
  // a later pass with a lower score never lowers bestScore or un-passes
  p = recordQuizResult(p, 'm02', 3)
  assert.equal(p.modules.m02.passed, true)
  assert.equal(p.modules.m02.bestScore, 10)
})

test('export/import round-trips and drops in-progress exam', () => {
  const p: Progress = { ...recordQuizResult(emptyProgress(), 'm01', 9), exam: { attempts: [], inProgress: { startedAt: 'x', elapsedBefore: 0, resumedAt: 'x', questions: [], answers: [], flagged: [], current: 0 } }, lastVisited: 'm01' }
  const code = exportProgress(p)
  assert.match(code, /^[A-Za-z0-9+/=]+$/)
  const back = importProgress(code)
  assert.equal(back.modules.m01.bestScore, 9)
  assert.equal(back.lastVisited, 'm01')
  assert.equal(back.exam.inProgress, undefined)
})

test('import rejects garbage with an Error', () => {
  assert.throws(() => importProgress('not base64!!'), Error)
  assert.throws(() => importProgress(btoa('"just a string"')), Error)
  assert.throws(() => importProgress(btoa(JSON.stringify({ version: 2 }))), Error)
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test` → fails on `./progress.ts` not found.

- [ ] **Step 3: Implement `src/lib/progress.ts`**

```ts
export const STORAGE_KEY = 'poppy-insurance-progress-v1'
export const QUIZ_SIZE = 10
export const QUIZ_PASS = 8
export const EXAM_SIZE = 100
export const EXAM_PASS_FRACTION = 0.7

export interface ModuleProgress {
  passed: boolean
  bestScore: number
  attempts: number
  lastAttemptAt: string
  scrollPos?: number
}

export interface ExamAttempt {
  startedAt: string
  finishedAt: string
  score: number // correct answers out of EXAM_SIZE
  byModule: Record<string, { correct: number; total: number }>
}

/** Enough to rebuild the exact same exam after a reload. */
export interface ExamInProgress {
  startedAt: string
  elapsedBefore: number // ms accumulated before the current session
  resumedAt: string     // ISO time this session (re)started
  questions: { id: string; order: number[] }[]
  answers: (number | null)[]
  flagged: string[]
  current: number
}

export interface Progress {
  version: 1
  modules: Record<string, ModuleProgress>
  exam: { attempts: ExamAttempt[]; inProgress?: ExamInProgress }
  lastVisited?: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const defaultStorage = (): StorageLike => globalThis.localStorage

export const emptyProgress = (): Progress => ({ version: 1, modules: {}, exam: { attempts: [] } })

/** Validates loosely and normalises; throws on anything that is not a v1 progress object. */
export function coerce(x: unknown): Progress {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('That is not a progress code')
  const o = x as Record<string, unknown>
  if (o.version !== 1) throw new Error('Unsupported progress version')
  const modules = o.modules && typeof o.modules === 'object' && !Array.isArray(o.modules) ? (o.modules as Progress['modules']) : {}
  const exam = o.exam && typeof o.exam === 'object' ? (o.exam as Partial<Progress['exam']>) : {}
  // Only add optional keys when present, so save→load round-trips deep-equal (no `key: undefined` noise).
  const out: Progress = { version: 1, modules, exam: { attempts: Array.isArray(exam.attempts) ? exam.attempts : [] } }
  if (exam.inProgress && typeof exam.inProgress === 'object') out.exam.inProgress = exam.inProgress
  if (typeof o.lastVisited === 'string') out.lastVisited = o.lastVisited
  return out
}

export function load(storage: StorageLike = defaultStorage()): Progress {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? coerce(JSON.parse(raw)) : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export function save(p: Progress, storage: StorageLike = defaultStorage()): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export function clear(storage: StorageLike = defaultStorage()): void {
  storage.removeItem(STORAGE_KEY)
}

const toBase64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''))
const fromBase64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)))

/** Compact base64 of the progress JSON, minus any in-progress exam (that stays on the device it started on). */
export function exportProgress(p: Progress): string {
  return toBase64(JSON.stringify({ ...p, exam: { attempts: p.exam.attempts } }))
}

export function importProgress(code: string): Progress {
  let json: string
  try { json = fromBase64(code.replace(/\s+/g, '')) } catch { throw new Error('That code is not valid — check you copied all of it') }
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { throw new Error('That code is not valid — check you copied all of it') }
  return coerce(parsed)
}

type ModuleRef = { id: string; order: number }
const byOrder = (modules: ModuleRef[]) => [...modules].sort((a, b) => a.order - b.order)

export function isModuleUnlocked(p: Progress, modules: ModuleRef[], id: string): boolean {
  const sorted = byOrder(modules)
  const i = sorted.findIndex((m) => m.id === id)
  if (i < 0) return false
  if (i === 0) return true
  return p.modules[sorted[i - 1].id]?.passed === true
}

export const isExamUnlocked = (p: Progress, modules: ModuleRef[]): boolean =>
  modules.length > 0 && modules.every((m) => p.modules[m.id]?.passed === true)

/** First module (in order) not yet passed; undefined when all are passed. */
export const nextModuleId = (p: Progress, modules: ModuleRef[]): string | undefined =>
  byOrder(modules).find((m) => p.modules[m.id]?.passed !== true)?.id

export function recordQuizResult(p: Progress, moduleId: string, score: number, now = new Date().toISOString()): Progress {
  const prev = p.modules[moduleId]
  return {
    ...p,
    modules: {
      ...p.modules,
      [moduleId]: {
        ...prev,
        passed: prev?.passed === true || score >= QUIZ_PASS,
        bestScore: Math.max(prev?.bestScore ?? 0, score),
        attempts: (prev?.attempts ?? 0) + 1,
        lastAttemptAt: now,
      },
    },
  }
}

export function recordExamAttempt(p: Progress, attempt: ExamAttempt): Progress {
  return { ...p, exam: { attempts: [...p.exam.attempts, attempt] } } // drops inProgress
}
```

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Commit** — `git add src/lib/progress.ts src/lib/progress.test.ts && git commit -m "feat: progress store logic with export/import"`

---

### Task 5: Question bank logic (pure)

**Files:**
- Create: `src/lib/questions.ts`, `src/lib/questions.test.ts`

**Interfaces:**
- Consumes: `shuffle`, `Rng` from `./shuffle.ts`; types from `../types.ts`.
- Produces: `normaliseStem(s)`, `buildExamBank(modules, extra): BankQuestion[]`, `moduleBank(module): BankQuestion[]`, `applyOrder(q, order): DrawnQuestion`, `draw(bank, n, rng?): DrawnQuestion[]`, `score(questions, answers): { correct, total, byModule }`.

- [ ] **Step 1: Failing tests**

`src/lib/questions.test.ts`:
```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32 } from './shuffle.ts'
import { applyOrder, buildExamBank, draw, moduleBank, normaliseStem, score } from './questions.ts'
import type { Module, Question } from '../types.ts'

const q = (id: string, stem: string, answerIndex = 1): Question => ({ id, topic: 't', stem, options: ['A', 'B', 'C', 'D'], answerIndex, explanation: 'because' })
const mod = (id: string, order: number, qs: Question[]): Module => ({ id, order, title: id, estimatedMinutes: 10, recap: [], sections: [], whyItMatters: '', questions: qs })

test('normaliseStem ignores case, punctuation and spacing', () => {
  assert.equal(normaliseStem('What is a  Peril?'), normaliseStem('what is a peril'))
})

test('buildExamBank tags module, dedupes on normalised stem, module copy wins', () => {
  const m1 = mod('m01', 1, [q('m01-q01', 'What is a peril?'), q('m01-q02', 'Define hazard')])
  const m2 = mod('m02', 2, [q('m02-q01', 'Who runs Lloyd’s?')])
  const extra: Question[] = [q('x-q01', 'what is a PERIL'), q('x-q02', 'Combine two ideas')]
  const bank = buildExamBank([m1, m2], extra)
  assert.deepEqual(bank.map((b) => b.id), ['m01-q01', 'm01-q02', 'm02-q01', 'x-q02'])
  assert.equal(bank[0].module, 'm01')
  assert.equal(bank[3].module, 'mixed')
})

test('applyOrder permutes options and keeps the right answer', () => {
  const d = applyOrder({ ...q('m01-q01', 'stem', 2), module: 'm01' }, [3, 2, 1, 0])
  assert.deepEqual(d.options, ['D', 'C', 'B', 'A'])
  assert.equal(d.options[d.answerIndex], 'C')
  assert.equal(d.answerIndex, 1)
  // round trip: rebuilding from stored order gives identical display
  const again = applyOrder({ ...q('m01-q01', 'stem', 2), module: 'm01' }, d.order)
  assert.deepEqual(again, d)
})

test('draw picks n distinct questions with shuffled options', () => {
  const bank = moduleBank(mod('m01', 1, Array.from({ length: 30 }, (_, i) => q(`m01-q${String(i + 1).padStart(2, '0')}`, `stem ${i}`, i % 4))))
  const a = draw(bank, 10, mulberry32(7))
  assert.equal(a.length, 10)
  assert.equal(new Set(a.map((x) => x.id)).size, 10)
  a.forEach((x) => assert.equal(x.options[x.answerIndex], ['A', 'B', 'C', 'D'][bank.find((b) => b.id === x.id)!.answerIndex]))
  const b = draw(bank, 10, mulberry32(8))
  assert.notDeepEqual(a.map((x) => x.id), b.map((x) => x.id))
})

test('score counts per module and totals equal the number of questions', () => {
  const qs = [
    applyOrder({ ...q('m01-q01', 's1', 0), module: 'm01' }, [0, 1, 2, 3]),
    applyOrder({ ...q('m01-q02', 's2', 1), module: 'm01' }, [0, 1, 2, 3]),
    applyOrder({ ...q('x-q01', 's3', 2), module: 'mixed' }, [0, 1, 2, 3]),
  ]
  const r = score(qs, [0, 3, null])
  assert.deepEqual(r, { correct: 1, total: 3, byModule: { m01: { correct: 1, total: 2 }, mixed: { correct: 0, total: 1 } } })
  assert.equal(Object.values(r.byModule).reduce((s, m) => s + m.total, 0), 3)
})
```

- [ ] **Step 2: Run, expect failure** — `npm test`.

- [ ] **Step 3: Implement `src/lib/questions.ts`**

```ts
import type { BankQuestion, DrawnQuestion, Module, Question } from '../types.ts'
import { shuffle, type Rng } from './shuffle.ts'

export const normaliseStem = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export const moduleBank = (m: Pick<Module, 'id' | 'questions'>): BankQuestion[] =>
  m.questions.map((q) => ({ ...q, module: m.id }))

/** All module questions (in module order) plus cross-module extras, deduped on normalised stem. First occurrence wins. */
export function buildExamBank(modules: Pick<Module, 'id' | 'order' | 'questions'>[], extra: Question[]): BankQuestion[] {
  const seen = new Set<string>()
  const out: BankQuestion[] = []
  const all: BankQuestion[] = [
    ...[...modules].sort((a, b) => a.order - b.order).flatMap(moduleBank),
    ...extra.map((q) => ({ ...q, module: 'mixed' })),
  ]
  for (const q of all) {
    const key = normaliseStem(q.stem)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(q)
  }
  return out
}

/** order[i] = original index of the option shown at position i. */
export function applyOrder(q: BankQuestion, order: number[]): DrawnQuestion {
  return { ...q, options: order.map((i) => q.options[i]), answerIndex: order.indexOf(q.answerIndex), order }
}

export function draw(bank: BankQuestion[], n: number, rng: Rng = Math.random): DrawnQuestion[] {
  return shuffle(bank, rng).slice(0, n).map((q) => applyOrder(q, shuffle([0, 1, 2, 3], rng)))
}

export interface ScoreResult {
  correct: number
  total: number
  byModule: Record<string, { correct: number; total: number }>
}

export function score(questions: DrawnQuestion[], answers: (number | null)[]): ScoreResult {
  const byModule: ScoreResult['byModule'] = {}
  let correct = 0
  questions.forEach((q, i) => {
    const m = (byModule[q.module] ??= { correct: 0, total: 0 })
    m.total++
    if (answers[i] === q.answerIndex) { m.correct++; correct++ }
  })
  return { correct, total: questions.length, byModule }
}
```

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Commit** — `git add src/lib/questions.ts src/lib/questions.test.ts && git commit -m "feat: exam bank build, draw and scoring"`

---

### Task 6: Content loader, hooks, app shell, styles

**Files:**
- Create: `src/content/index.ts`, `src/hooks/useProgress.ts`, `src/hooks/useRoute.ts`, `src/components/Layout.tsx`, `src/components/Markdown.tsx`, `src/components/ProgressRing.tsx`, `src/pages/NotFound.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: `modules: Module[]` (sorted), `moduleById(id)`, `examBank: BankQuestion[]` from `src/content/index.ts`; `useProgress(): Progress` and `progressStore.update(fn)`, `progressStore.reset()`, `progressStore.replace(p)`; `useRoute(): Route`.

- [ ] **Step 1: Content loader**

`src/content/index.ts`:
```ts
import type { BankQuestion, Module, Question } from '../types'
import { buildExamBank } from '../lib/questions'
import extra from './exam-extra.json'

const files = import.meta.glob<Module>('./modules/*.json', { eager: true, import: 'default' })

export const modules: Module[] = Object.values(files).sort((a, b) => a.order - b.order)
export const moduleById = (id: string): Module | undefined => modules.find((m) => m.id === id)
export const examBank: BankQuestion[] = buildExamBank(modules, (extra as { questions: Question[] }).questions)
```
Until Task 11 lands, create a placeholder `src/content/exam-extra.json` containing `{ "questions": [] }` so the import resolves. Task 11 overwrites it.

- [ ] **Step 2: Hooks**

`src/hooks/useProgress.ts`:
```ts
import { useSyncExternalStore } from 'react'
import { clear, load, save, type Progress } from '../lib/progress'

let state: Progress = load()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const progressStore = {
  get: () => state,
  update(fn: (p: Progress) => Progress) { state = fn(state); save(state); emit() },
  replace(p: Progress) { state = p; save(state); emit() },
  reset() { clear(); state = load(); emit() },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
}

export const useProgress = (): Progress => useSyncExternalStore(progressStore.subscribe, progressStore.get)
```

`src/hooks/useRoute.ts`:
```ts
import { useSyncExternalStore } from 'react'
import { parseHash, type Route } from '../lib/router'

const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
const getHash = () => window.location.hash

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseHash(hash)
}
```

- [ ] **Step 3: Layout, Markdown, ProgressRing, NotFound**

`Layout.tsx` props: `{ title?: string; back?: { href: string; label: string }; children; action?: ReactNode }`. Renders `<header class="topbar">` with back link (`<a href={back.href}>‹ {label}</a>`) and title, then `<main>`. On home, title is the exact string "Insurance Foundations — built for Poppy" rendered as `<h1>`.

`Markdown.tsx`: `({ body }: { body: string })` → `parseMarkdown(body).map(...)`: p→`<p>`, h3→`<h3>`, ul→`<ul><li>`, ol→`<ol><li>`; inline via `parseInline` → `<strong>`, `<em>`, text. Keys by index.

`ProgressRing.tsx`: `({ value, max, size = 96 })` SVG circle with `stroke-dasharray` showing `value/max`, label `"{value}/{max}"` in the centre, `role="img" aria-label="{value} of {max} modules passed"`.

`NotFound.tsx`: "That page doesn't exist." + `<a href="#/">Back to home</a>`.

- [ ] **Step 4: App.tsx route switch**

```tsx
import { useEffect } from 'react'
import { useRoute } from './hooks/useRoute'
import { routePath } from './lib/router'
import Home from './pages/Home'
import ModuleRead from './pages/ModuleRead'
import ModuleQuiz from './pages/ModuleQuiz'
import Exam from './pages/Exam'
import ExamResults from './pages/ExamResults'
import ProgressPage from './pages/ProgressPage'
import NotFound from './pages/NotFound'

export default function App() {
  const route = useRoute()
  const path = routePath(route)
  useEffect(() => { if (route.name !== 'module') window.scrollTo(0, 0) }, [path]) // eslint-disable-line react-hooks/exhaustive-deps
  switch (route.name) {
    case 'home': return <Home />
    case 'module': return <ModuleRead id={route.id} />
    case 'quiz': return <ModuleQuiz id={route.id} />
    case 'exam': return <Exam />
    case 'examResults': return <ExamResults />
    case 'progress': return <ProgressPage />
    default: return <NotFound />
  }
}
```
For this task, create the five page files as minimal stubs that render their name (Tasks 7–8 fill them in) so the app compiles.

- [ ] **Step 5: styles.css**

Variables on `:root` (light) and under `@media (prefers-color-scheme: dark)`: `--bg`, `--surface`, `--text`, `--muted`, `--accent` (#0f766e light / #5eead4 dark), `--accent-contrast`, `--border`, `--ok` (green), `--bad` (red), `--warn` (amber), `--radius: 14px`. Base: `html { font-size: 17px; } body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.65; background: var(--bg); color: var(--text); margin: 0; }`, `main { max-width: 680px; margin: 0 auto; padding: 16px 16px calc(96px + env(safe-area-inset-bottom)); }`. Buttons: `.btn` min-height 48px, full-width on mobile (`width: 100%` under 600px), `.btn-primary`, `.btn-ghost`; visible `:focus-visible` outline 3px accent. Cards `.card` with surface, border, radius, padding 16px. `.option` buttons: full width, text-left, min-height 52px, border 2px, states `.is-correct`, `.is-wrong`, `.is-selected`, `[disabled]`. `.sticky-cta` fixed bottom bar with safe-area padding. `.dots` progress dots row (`.dot`, `.dot.done`, `.dot.current`). `.grid-review` 10-column grid of 36px cells (`.answered`, `.flagged`, `.current`). `.topbar` sticky top with back link. `.list-item` module row with status badge (`.badge-locked`, `.badge-ready`, `.badge-passed`). Keep it to one file, under ~250 lines; no framework.

- [ ] **Step 6: Typecheck + build with a throwaway sample module**

Generate `src/content/modules/01-sample.json` again from the scratchpad generator (see Task 2) so the glob has one module, then `npm run typecheck && npx vite build`. Expected: success. Then `rm src/content/modules/01-sample.json`.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: app shell, content loader, hooks and base styles"`

---

### Task 7: Home, ModuleRead, ModuleQuiz pages + QuestionCard + ModuleListItem

**Files:**
- Create: `src/components/QuestionCard.tsx`, `src/components/ModuleListItem.tsx`
- Modify: `src/pages/Home.tsx`, `src/pages/ModuleRead.tsx`, `src/pages/ModuleQuiz.tsx`

**Interfaces:**
- Consumes: `modules`, `moduleById`, `useProgress`, `progressStore`, `draw`, `moduleBank`, `recordQuizResult`, `isModuleUnlocked`, `nextModuleId`, `QUIZ_SIZE`, `QUIZ_PASS`, `Markdown`, `Layout`, `ProgressRing`.
- Produces: `QuestionCard` props:
  ```ts
  interface QuestionCardProps {
    question: DrawnQuestion
    index: number; total: number          // "Question 3 of 10"
    selected: number | null
    submitted: boolean                     // quiz: true after answering; exam: always false
    showFeedback: boolean                  // quiz: true; exam: false
    onSelect: (optionIndex: number) => void
  }
  ```
  Renders stem as `<h2>`, options as `<button class="option" aria-pressed>` with letters A–D, disabled when `submitted`. When `showFeedback && submitted`: mark correct `.is-correct`, wrong pick `.is-wrong`, and a `<div role="status" aria-live="polite" class="feedback">` saying "Correct." or "Not quite." followed by the explanation.

- [ ] **Step 1: Home**

- `<Layout title="Insurance Foundations — built for Poppy">` (as h1).
- Intro line: "Twelve short modules, then a final exam. Pass each quiz (8/10) to unlock the next."
- `<ProgressRing value={passedCount} max={modules.length} />` plus "{n} of 12 passed".
- Continue button: if `isExamUnlocked` → "Continue: Final exam" → `#/exam`; else target = `nextModuleId` (fallback `progress.lastVisited` if that module is unlocked and not passed) → "Continue: {title}" → `#/module/{id}`. Label "Start here" when nothing passed yet.
- Module list: `modules.map(m => <ModuleListItem …/>)` with status `locked | available | passed`, best score `bestScore/10` when attempts > 0, estimated minutes. Locked items are `<div aria-disabled>` not links; available/passed are `<a href="#/module/{id}">`.
- Final exam card: locked state shows "Unlocks when all 12 modules are passed"; unlocked shows "100 questions, pass mark 70%, untimed" and a button to `#/exam`; if an attempt exists, show best exam % too. If `exam.inProgress` exists, button reads "Resume exam".
- Footer link to `#/progress` ("Progress, export & import").

- [ ] **Step 2: ModuleRead**

- `const m = moduleById(id)`; if missing → `<NotFound/>`. If not unlocked → Layout with "This module unlocks when you pass {previous title}." and link home.
- On mount: `progressStore.update(p => ({ ...p, lastVisited: id }))`; restore scroll: `window.scrollTo(0, p.modules[id]?.scrollPos ?? 0)` inside `requestAnimationFrame`.
- Save scroll position: `scroll` listener, throttled with a 300ms timeout, writes `scrollPos` into `p.modules[id]` (create the entry with `passed:false,bestScore:0,attempts:0,lastAttemptAt:''` if absent — or better: keep `scrollPos` only when an entry exists; if none, create one with those defaults). Remove listener on unmount and flush once.
- Layout: back link "‹ Home", title "{order}. {title}", "~{estimatedMinutes} min read".
- Quick recap card: `<section class="card recap"><h2>Quick recap</h2><ul>…5 bullets…</ul></section>` at the top.
- Sections: `<article>` per section, `<h2>` heading, `<Markdown body/>`.
- "Why this matters for a broker" callout card after the last section (`whyItMatters`).
- `<div class="sticky-cta"><a class="btn btn-primary" href="#/module/{id}/quiz">Take the quiz</a></div>`.

- [ ] **Step 3: ModuleQuiz**

- Guard like ModuleRead (unknown → NotFound; locked → message).
- State: `questions` = `useState(() => draw(moduleBank(m), QUIZ_SIZE))`; `i`; `selected: number|null`; `submitted`; `answers: (number|null)[]`; `done`.
- Flow per question: tap option → `selected` set and immediately `submitted = true` (one tap submits; brief: "can't change an answer once submitted"). Show feedback. "Next question" button (or "See score" on the last). Keyboard: options are buttons, so Enter/Space work; "Next" gets focus after submit (`useRef` + `focus()`).
- Progress dots: 10 dots, `done` for answered, `current` for i.
- Score screen when done: `score = answers.filter((a, k) => a === questions[k].answerIndex).length`; on reaching done (in the handler, not an effect) call `progressStore.update(p => recordQuizResult(p, id, score))`.
  - Headline: passed → `Nice — ${score}/10.` + (next module exists ? ` On to ${nextTitle}.` : ' That’s all twelve — the final exam is open.') ; failed → `${score}/10 — not quite. You need 8. Have another go, the questions change each time.`
  - Buttons: "Retry (new questions)" → reset all state with a fresh `draw(...)` (use a `key` on the inner component or a `resetKey` state); "Next module" (only if passed and next exists) → `#/module/{nextId}`; "Final exam" (if all passed) → `#/exam`; "Back to reading" → `#/module/{id}`; "Home".
- `aria-live` feedback is inside `QuestionCard`.

- [ ] **Step 4: Typecheck, build with sample, delete sample, commit**

`npm run typecheck`, sample-module build as in Task 6 Step 6, `rm` sample. Commit: `git add -A && git commit -m "feat: home, reading and quiz pages"`.

---

### Task 8: Exam, ExamResults, ProgressPage

**Files:**
- Modify: `src/pages/Exam.tsx`, `src/pages/ExamResults.tsx`, `src/pages/ProgressPage.tsx`

**Interfaces:**
- Consumes: `examBank`, `draw`, `applyOrder`, `score`, `EXAM_SIZE`, `EXAM_PASS_FRACTION`, `isExamUnlocked`, `recordExamAttempt`, `exportProgress`, `importProgress`, `progressStore`, `useProgress`, `QuestionCard`, `Layout`, `modules`.

- [ ] **Step 1: Exam**

- If `!isExamUnlocked(progress, modules)` → Layout with "The final exam unlocks once all 12 modules are passed." + link home.
- Resume or start: on first render compute `inProgress = progress.exam.inProgress`. If present → rebuild `questions = inProgress.questions.map(({id, order}) => applyOrder(bankById.get(id)!, order))` (skip any id no longer in the bank — content may change — and if that leaves fewer than `EXAM_SIZE`, discard and start fresh); set `resumedAt = now` and persist. If absent → `questions = draw(examBank, EXAM_SIZE)`, `inProgress = { startedAt: now, elapsedBefore: 0, resumedAt: now, questions: questions.map(q => ({ id: q.id, order: q.order })), answers: Array(100).fill(null), flagged: [], current: 0 }`, persist. Do this in a `useState` initializer + one `useEffect` that persists; keep `questions` in state so they never re-draw on re-render.
- Autosave: every change to answers/flagged/current → `progressStore.update(p => ({ ...p, exam: { ...p.exam, inProgress: { ...ip, elapsedBefore: ip.elapsedBefore + (Date.now() - Date.parse(ip.resumedAt)), resumedAt: new Date().toISOString() } } }))`. (`ponytail:` elapsed only advances while the tab is open and something changes or on a 15s heartbeat; good enough for "show elapsed".)
- Timer: `useEffect` with `setInterval(1000)` updating a `now` state; display `format(ip.elapsedBefore + (now - Date.parse(ip.resumedAt)))` as `mm:ss` or `h:mm:ss`. Also persist on a 15s heartbeat so closing the tab loses at most 15s.
- Header: "Final exam · Q {current+1}/100 · ⏱ {elapsed}". Buttons row: "‹ Prev", "Flag" (toggle, `aria-pressed`, shows "Flagged" when set), "Next ›", and "Review & submit".
- `QuestionCard` with `showFeedback={false}`, `submitted={false}` — the user can change an answer before submitting.
- Review mode: `view: 'question' | 'review'`. Review shows counts (answered / unanswered / flagged), a `.grid-review` of 100 cells (button each, `aria-label="Question 17, answered, flagged"`), tapping a cell jumps to it. "Submit exam" button; if unanswered > 0 use `window.confirm(\`${n} unanswered — submit anyway?\`)`.
- Submit: `r = score(questions, answers)`; `attempt = { startedAt: ip.startedAt, finishedAt: now, score: r.correct, byModule: r.byModule }`; `progressStore.update(p => recordExamAttempt(p, attempt))`; `navigate('#/exam/results')`.
- "Abandon attempt" link at the bottom of the review view with confirm → clears `inProgress` and goes home.

- [ ] **Step 2: ExamResults**

- Reads `progress.exam.attempts`; shows the latest (`at(-1)`); if none → "No exam attempts yet." + link to `#/exam`.
- Headline: `${pct}%` with pass/fail (`score / EXAM_SIZE >= EXAM_PASS_FRACTION`): pass → "Passed — that’s the whole course. Brilliant." fail → "Not this time — 70% needed. Your weakest modules are listed first."
- Elapsed: `finishedAt - startedAt` formatted (note: this is wall-clock; label it "Started … · Finished …" rather than "time taken" to avoid lying when the exam spanned a closed tab. Simpler and honest).
- Breakdown table sorted by percentage ascending: rows for each module id present in `byModule`, label = module title (or "Mixed scenarios" for `mixed`), `correct/total`, a small bar, and a "Revise" link to `#/module/{id}` (not for `mixed`).
- Buttons: "Retake exam" → `#/exam`, "Home".

- [ ] **Step 3: ProgressPage**

- Module table: order, title, status, best score, attempts, last attempt date (`toLocaleDateString('en-GB')`).
- Exam attempts list, newest first: date, `score/100`, pass/fail.
- Export: button "Copy export code" → `navigator.clipboard.writeText(exportProgress(p))` with try/catch; always also render the code in a readonly `<textarea>` (selectable) so it works where clipboard is blocked (iOS Safari in some contexts). Status line "Copied" via `role="status"`.
- Import: `<textarea>` + "Import" button; on click `try { progressStore.replace(importProgress(text)) ; status 'Progress restored.' } catch (e) { status = e.message }`. Confirm before replacing if current progress has any attempts.
- Reset: "Reset everything" → `window.confirm('This wipes all progress on this device. Sure?')` → `progressStore.reset()`.

- [ ] **Step 4: Typecheck, build with sample module, delete sample, commit**

`git add -A && git commit -m "feat: exam, results and progress pages"`

---

### Task 9: README + smoke run

**Files:**
- Create: `README.md`

- [ ] **Step 1: README.md** with sections: What this is (one paragraph, for Poppy); Run locally (`npm install`, `npm run dev`); Checks (`npm run validate`, `npm test`, `npm run build`); Deploy (create a GitHub repo, push `main`, Settings → Pages → Source: **GitHub Actions**; the workflow builds and deploys; URL is `https://<owner>.github.io/<repo>/`); Editing content (file layout, the markdown subset, word-count and recap rules, run the validator); Adding questions (shape, rules: 4 options, one correct, no all/none of the above, topic, explanation; the validator enforces 30 per module and ≥250 bank; exam-extra for cross-module); Progress data (localStorage key, export/import).

- [ ] **Step 2: Smoke run with sample content**

Generate the sample module, run `npm run dev`, open in the built-in browser at 375px, click through home → module → quiz (answer 10) → score screen → progress page export/import/reset. Fix anything broken. Delete the sample. `npm run typecheck && npm test` green.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "docs: README"`

---

## Stage 2 — Content (12 agents in parallel, Task 10)

### Task 10: Write module N (repeat for N = 01…12)

**Files:**
- Create: `src/content/modules/NN-<slug>.json` (slugs below)

| N | file | title |
|---|------|-------|
| 01 | `01-what-insurance-is.json` | What insurance actually is |
| 02 | `02-uk-insurance-market.json` | How the UK insurance market works |
| 03 | `03-contract-basics-and-agency.json` | Contract basics & agency |
| 04 | `04-insurable-interest.json` | Insurable interest |
| 05 | `05-fair-presentation-and-good-faith.json` | Fair presentation & good faith |
| 06 | `06-proximate-cause.json` | Proximate cause |
| 07 | `07-indemnity.json` | Indemnity |
| 08 | `08-contribution-and-subrogation.json` | Contribution & subrogation |
| 09 | `09-policies-wordings-and-claims.json` | Policies, wordings & claims |
| 10 | `10-regulation-fca-consumer-duty.json` | Regulation, FCA & Consumer Duty |
| 11 | `11-ethics-and-the-brokers-day-job.json` | Ethics, the broker's day job & how the market talks |
| 12 | `12-health-and-protection.json` | Health & protection insurance |

**Interfaces:**
- Consumes: `scripts/validate.mjs --file`, `src/types.ts`, the brief's module topic list for N, tone rules, question rules.
- Produces: one valid module JSON.

- [ ] **Step 1: Read** the brief (`docs/superpowers/specs/2026-10-12-brief.md`): "Who it's for", "Tone", "Learning design", your module's line under "Modules", "Question bank rules", "Data schema". Read `src/types.ts`.
- [ ] **Step 2: Plan sections** — 4–6 headings that between them cover every topic in your module's list; a 5-bullet recap; the one-line "why this matters for a broker".
- [ ] **Step 3: Write the JSON** — `id: "mNN"`, `order: N`, `title` exactly as in the table, `estimatedMinutes` ≈ words/130 rounded to 5, sections totalling 1,700–2,200 words (validator allows 1,600–2,400), markdown subset only, 30 questions `mNN-q01..q30` with ~15 recall, ~9 scenario (use everyday people: Poppy's friend's café, her brother's van, her flat, a travel claim…), ~6 true/false-statement style ("Which of these statements is true?"), correct position spread roughly 7–8 per position, distinct stems, every explanation teaches the point in 1–2 sentences. Module 11 must include the 40-term glossary inside a section (as a bulleted list `- **Term** — meaning`), counted in the word total. Module 12 keeps pricing/underwriting mechanics at overview level.
- [ ] **Step 4: Validate** — `node scripts/validate.mjs --file src/content/modules/NN-<slug>.json`; fix until `✔`.
- [ ] **Step 5: Self-check accuracy** — Insurance Act 2015 (commercial; duty of fair presentation; remedies: deliberate/reckless → avoid + keep premium; careless → proportionate remedy: would have declined → avoid & return premium; different terms → treat as if those terms; higher premium → reduce claim proportionately), CIDRA 2012 (consumers; duty to take reasonable care not to misrepresent; qualifying misrepresentation deliberate/reckless vs careless), Consumer Duty (FCA, in force since July 2023 for open products, July 2024 for closed books), FCA conduct / PRA prudential, FOS and FSCS roles, Lloyd's structure (syndicates, managing agents, members, brokers), UK GDPR / Data Protection Act 2018. Do not invent statistics or case names; use generic "a well-known case" framing if an example is needed, or make scenarios hypothetical.
- [ ] **Step 6: Commit** — `git add src/content/modules/NN-<slug>.json && git commit -m "content: module NN <title>"`. (Parallel agents each commit their own file; sequential commits on one branch are fine. If `git commit` fails because of a lock, wait a second and retry.)

---

## Stage 3 — Exam extras (one agent, Task 11)

### Task 11: Cross-module exam questions

**Files:**
- Create/overwrite: `src/content/exam-extra.json`

- [ ] **Step 1: Read all 12 module files** (skim sections, read all question stems) to avoid duplicating any existing stem.
- [ ] **Step 2: Write 40 questions** `x-q01..x-q40`, each `"module": "mixed"`, `"topic"` naming the two concepts combined (e.g. `"proximate cause + exclusions"`). Scenario-heavy; at least these combinations: proximate cause + exclusions; fair presentation + remedies; indemnity + average; insurable interest + contract formation; contribution + indemnity; subrogation + claims process; Consumer Duty + broker suitability; agency + commission disclosure; PMI underwriting (moratorium vs FMU) + fair presentation; claims-made vs losses-occurring + renewal; FOS/FSCS + regulation; Lloyd's + broker role. Rules identical to module questions; spread correct positions 10/10/10/10 ± 2.
- [ ] **Step 3: Validate the whole set** — `npm run validate` → must print `exam bank: N distinct questions` with N ≥ 250 and `✔ content is valid`. Fix any module-level errors you see only if trivial (JSON typo); otherwise report them.
- [ ] **Step 4: Commit** — `git add src/content/exam-extra.json && git commit -m "content: cross-module exam questions"`

---

## Stage 4 — Integration, mobile QA, deploy config, README (one agent, Task 12)

### Task 12: Integration and QA

- [ ] **Step 1:** `npm ci && npm run validate && npm test && npm run build` all green. Fix anything red.
- [ ] **Step 2:** Run `npm run preview`, open in the built-in browser at 375×812 (`resize_window` mobile preset) and desktop. Walk: home → module 1 reading (recap, sections, callout, sticky button, dark mode via `colorScheme: 'dark'`) → quiz → score → next module unlocked → progress page export → reset → import restores → re-check home. Use `javascript_tool` to seed localStorage with all 12 passed to reach the exam; take the exam partially, reload, confirm it resumes with the same question/answers/flags; submit; results show per-module rows that sum to 100.
- [ ] **Step 3:** Check readability: body ≥ 17px, no horizontal scroll at 375px, tap targets ≥ 44px, focus rings visible via keyboard Tab, aria-live announces feedback (inspect DOM). Fix issues in CSS/components.
- [ ] **Step 4:** Review README against the real repo (scripts, paths, Pages steps). Confirm `vite.config.ts` base logic by running `GITHUB_REPOSITORY=someone/insurance-foundations npx vite build` and checking `dist/index.html` asset paths start with `/insurance-foundations/`.
- [ ] **Step 5:** Commit fixes: `git add -A && git commit -m "fix: integration and mobile QA"`.

---

## Stage 5 — Fresh verification (one agent, Task 13)

### Task 13: Independent verification

Run exactly the brief's "Verification" list (section in the spec) and report pass/fail per item with evidence (command output, screenshots described). Fix failures, commit as `fix: verification findings`, re-run the failing check, and only then declare done. Spot-read modules 05, 07, 12 for tone and legal accuracy; spot-check 20 random questions (pick with `node -e` random sampling across files) for exactly one defensible answer and a matching explanation; if a question is wrong or ambiguous, rewrite it in place and re-run `npm run validate`.

---

## Self-review notes

- Spec coverage: every brief section maps to a task (orchestration → stages; tone/content → Task 10/11; learning design → Tasks 5, 7, 8; schema/validator → Task 2; app/routes/pages → Tasks 6–8; progress key/shape → Task 4; deployment → Task 1; README → Task 9; verification → Task 13).
- Type consistency: `DrawnQuestion.order`, `ExamInProgress.questions[{id, order}]`, `score()` → `{correct,total,byModule}` match `ExamAttempt.byModule`; `recordQuizResult(p, id, score)` used by Task 7; `nextModuleId` used by Home and quiz score screen.
- Review Focus items 1–5 each have a pinned test (Tasks 3, 4, 5) or a manual check (Task 12 step 2 for resume).
