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
