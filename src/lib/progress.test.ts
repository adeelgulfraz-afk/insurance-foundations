import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyProgress, load, save, clear, exportProgress, importProgress, isModuleUnlocked, isExamUnlocked,
  nextModuleId, recordQuizResult, examScore, STORAGE_KEY, EXAM_SIZE, type Progress, type ExamInProgress,
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

test('import sanitises badly shaped v1 data instead of letting it crash the app', () => {
  const code = (x: unknown) => btoa(JSON.stringify(x))
  assert.deepEqual(importProgress(code({ version: 1, exam: { attempts: [null] } })).exam, { attempts: [] })
  assert.deepEqual(importProgress(code({ version: 1, modules: { m01: null } })).modules, {})
  assert.deepEqual(importProgress(code({ version: 1, exam: { attempts: [], inProgress: {} } })).exam, { attempts: [] })
})

test('load sanitises a stored inProgress with the wrong shape', () => {
  const s = mem()
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modules: { m01: { passed: 'yes' } }, exam: { attempts: [{ score: 1 }], inProgress: { questions: [] } } }))
  assert.deepEqual(load(s), emptyProgress())
})

test('blocked or full storage never throws', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError') } })
  try {
    assert.deepEqual(load(), emptyProgress())
    assert.doesNotThrow(() => save(emptyProgress()))
    assert.doesNotThrow(() => clear())
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage
  }
  const full = { ...mem(), setItem: () => { throw new Error('QuotaExceededError') } }
  assert.doesNotThrow(() => save(emptyProgress(), full))
})

const ip = (over: Partial<ExamInProgress> = {}): ExamInProgress =>
  ({ startedAt: 'x', elapsedBefore: 0, resumedAt: 'x', questions: [{ id: 'm01-q01', order: [0, 1, 2, 3] }], answers: [null], flagged: [], current: 0, ...over })

test('import drops an inProgress exam even from a hand-made code', () => {
  const code = btoa(JSON.stringify({ version: 1, modules: {}, exam: { attempts: [], inProgress: ip() } }))
  assert.equal(importProgress(code).exam.inProgress, undefined)
})

test('load keeps a valid inProgress but drops one with a non-integer current', () => {
  const s = mem()
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modules: {}, exam: { attempts: [], inProgress: ip() } }))
  assert.deepEqual(load(s).exam.inProgress, ip())
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modules: {}, exam: { attempts: [], inProgress: ip({ current: 1.5 }) } }))
  assert.equal(load(s).exam.inProgress, undefined)
})

test('examScore totals the questions asked, falls back to EXAM_SIZE, and passes at 70%', () => {
  const a = (score: number, byModule: Record<string, { correct: number; total: number }>) => ({ startedAt: 'x', finishedAt: 'y', score, byModule })
  assert.deepEqual(examScore(a(70, { m01: { correct: 40, total: 60 }, mixed: { correct: 30, total: 40 } })), { total: 100, percent: 70, passed: true })
  assert.deepEqual(examScore(a(69, { m01: { correct: 69, total: 100 } })), { total: 100, percent: 69, passed: false })
  assert.deepEqual(examScore(a(50, {})), { total: EXAM_SIZE, percent: 50, passed: false })
  assert.deepEqual(examScore(a(8, { m01: { correct: 8, total: 10 } })), { total: 10, percent: 80, passed: true })
})
