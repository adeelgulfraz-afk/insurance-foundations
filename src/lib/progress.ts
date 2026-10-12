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

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

const isModuleProgress = (v: unknown): v is ModuleProgress =>
  isObj(v) && typeof v.passed === 'boolean' && isNum(v.bestScore) && isNum(v.attempts) && isStr(v.lastAttemptAt) &&
  (v.scrollPos === undefined || isNum(v.scrollPos))

const isExamAttempt = (v: unknown): v is ExamAttempt =>
  isObj(v) && isStr(v.startedAt) && isStr(v.finishedAt) && isNum(v.score) && isObj(v.byModule) &&
  Object.values(v.byModule).every((r) => isObj(r) && isNum(r.correct) && isNum(r.total))

const isExamInProgress = (v: unknown): v is ExamInProgress =>
  isObj(v) && Array.isArray(v.questions) && v.questions.every((q) => isObj(q) && isStr(q.id) && Array.isArray(q.order)) && Array.isArray(v.answers) && Array.isArray(v.flagged) &&
  isNum(v.current) && isNum(v.elapsedBefore) && isStr(v.startedAt) && isStr(v.resumedAt)

/** Throws on anything that is not a v1 progress object; inside one, silently drops entries with the wrong shape. */
export function coerce(x: unknown): Progress {
  if (!isObj(x)) throw new Error('That is not a progress code')
  if (x.version !== 1) throw new Error('Unsupported progress version')
  const modules: Progress['modules'] = {}
  if (isObj(x.modules)) for (const [id, m] of Object.entries(x.modules)) if (isModuleProgress(m)) modules[id] = m
  const exam = isObj(x.exam) ? x.exam : {}
  // Only add optional keys when present, so save→load round-trips deep-equal (no `key: undefined` noise).
  const out: Progress = { version: 1, modules, exam: { attempts: Array.isArray(exam.attempts) ? exam.attempts.filter(isExamAttempt) : [] } }
  if (isExamInProgress(exam.inProgress)) out.exam.inProgress = exam.inProgress
  if (isStr(x.lastVisited)) out.lastVisited = x.lastVisited
  return out
}

// Storage can be blocked (privacy modes) or full; progress then just doesn't persist, the app still works.
export function load(storage?: StorageLike): Progress {
  try {
    const raw = (storage ?? defaultStorage()).getItem(STORAGE_KEY)
    return raw ? coerce(JSON.parse(raw)) : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export function save(p: Progress, storage?: StorageLike): void {
  try { (storage ?? defaultStorage()).setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* not persisted */ }
}

export function clear(storage?: StorageLike): void {
  try { (storage ?? defaultStorage()).removeItem(STORAGE_KEY) } catch { /* nothing to clear */ }
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
