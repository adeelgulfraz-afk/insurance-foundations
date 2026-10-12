import type { BankQuestion, DrawnQuestion, Module, Question } from '../types.ts'
import { shuffle, type Rng } from './shuffle.ts'

// Must stay identical to normaliseStem in scripts/validate.mjs (the content validator's dedupe).
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
