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
if (argv.includes('--file') && (!fileArg || fileArg.startsWith('--'))) {
  console.error('usage: node scripts/validate.mjs [--file <module.json>]')
  process.exit(2)
}

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const BANNED_OPTION = /\b(all|none|both) of the above\b/i
// Must stay identical to normaliseStem in src/lib/questions.ts (the app's exam-bank dedupe).
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
