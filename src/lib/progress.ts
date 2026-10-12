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
