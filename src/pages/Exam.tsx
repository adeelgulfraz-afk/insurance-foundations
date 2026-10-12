import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import QuestionCard from '../components/QuestionCard'
import { examBank, modules } from '../content'
import { progressStore, useProgress } from '../hooks/useProgress'
import { applyOrder, draw, score } from '../lib/questions'
import { EXAM_SIZE, isExamUnlocked, recordExamAttempt, type ExamInProgress } from '../lib/progress'
import { navigate } from '../lib/router'
import type { DrawnQuestion } from '../types'

const bankById = new Map(examBank.map((q) => [q.id, q]))

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Rebuild the saved attempt exactly (same questions, option order, answers, flags), or draw a fresh one. */
function startOrResume(): { questions: DrawnQuestion[]; ip: ExamInProgress } {
  const now = new Date().toISOString()
  const saved = progressStore.get().exam.inProgress
  if (saved) {
    const questions = saved.questions.flatMap(({ id, order }) => {
      const q = bankById.get(id)
      return q ? [applyOrder(q, order)] : []
    })
    // Content changed under us (a question vanished) → the saved answers no longer line up, so start again.
    if (questions.length === saved.questions.length && questions.length === Math.min(EXAM_SIZE, examBank.length)) {
      return { questions, ip: { ...saved, resumedAt: now } }
    }
  }
  const questions = draw(examBank, EXAM_SIZE)
  return {
    questions,
    ip: {
      startedAt: now, elapsedBefore: 0, resumedAt: now,
      questions: questions.map((q) => ({ id: q.id, order: q.order })),
      answers: Array(questions.length).fill(null), flagged: [], current: 0,
    },
  }
}

/** Fold the time since resumedAt into elapsedBefore, so a closed tab only ever loses the time since the last save. */
const roll = (ip: ExamInProgress): ExamInProgress => {
  const now = Date.now()
  return { ...ip, elapsedBefore: ip.elapsedBefore + (now - Date.parse(ip.resumedAt)), resumedAt: new Date(now).toISOString() }
}

export default function Exam() {
  const p = useProgress()
  if (!isExamUnlocked(p, modules)) {
    return (
      <Layout title="Final exam" back={{ href: '#/', label: 'Home' }}>
        <p>The final exam unlocks once all {modules.length} modules are passed.</p>
        <a className="btn btn-primary" href="#/">Back to home</a>
      </Layout>
    )
  }
  return <ExamRun />
}

function ExamRun() {
  const [init] = useState(startOrResume)
  const { questions } = init
  const [ip, setIp] = useState(init.ip)
  const [view, setView] = useState<'question' | 'review'>('question')
  const [now, setNow] = useState(Date.now)
  const ipRef = useRef(ip)
  const finished = useRef(false)

  const save = (next: ExamInProgress) => {
    if (finished.current) return
    const rolled = roll(next)
    ipRef.current = rolled
    setIp(rolled)
    progressStore.update((s) => ({ ...s, exam: { ...s.exam, inProgress: rolled } }))
  }
  const change = (patch: Partial<ExamInProgress>) => save({ ...ipRef.current, ...patch })

  useEffect(() => {
    save(ipRef.current) // persist the fresh draw / resumed attempt straight away
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const heartbeat = setInterval(() => { if (!document.hidden) save(ipRef.current) }, 15000)
    // Hidden time (app switched, phone locked) is not exam time: bank it on hide, restart the clock on show.
    const onVisibility = () => {
      if (document.hidden) save(ipRef.current)
      else if (!finished.current) {
        const resumed = { ...ipRef.current, resumedAt: new Date().toISOString() }
        ipRef.current = resumed
        setIp(resumed)
        progressStore.update((s) => ({ ...s, exam: { ...s.exam, inProgress: resumed } }))
        setNow(Date.now())
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(tick)
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibility)
      save(ipRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const total = questions.length
  const answered = ip.answers.filter((a) => a !== null).length
  const unanswered = total - answered
  const q = questions[ip.current]
  const isFlagged = ip.flagged.includes(q.id)
  const elapsed = formatElapsed(ip.elapsedBefore + (now - Date.parse(ip.resumedAt)))

  const go = (k: number) => { change({ current: k }); setView('question'); window.scrollTo(0, 0) }
  const toggleFlag = () => change({ flagged: isFlagged ? ip.flagged.filter((id) => id !== q.id) : [...ip.flagged, q.id] })
  const openReview = () => { setView('review'); window.scrollTo(0, 0) }

  const submit = () => {
    if (unanswered > 0 && !window.confirm(`${unanswered} unanswered — submit anyway?`)) return
    const r = score(questions, ip.answers)
    finished.current = true
    progressStore.update((s) => recordExamAttempt(s, { startedAt: ip.startedAt, finishedAt: new Date().toISOString(), score: r.correct, byModule: r.byModule }))
    navigate('#/exam/results')
  }

  const abandon = () => {
    if (!window.confirm('Abandon this attempt? Your answers so far will be lost.')) return
    finished.current = true
    progressStore.update((s) => ({ ...s, exam: { attempts: s.exam.attempts } }))
    navigate('#/')
  }

  const meta = <span className="topbar-meta" role="timer" aria-label={`Elapsed ${elapsed}`}>Q {ip.current + 1}/{total} · {elapsed}</span>

  if (view === 'review') {
    return (
      <Layout title="Review your answers" back={{ href: '#/', label: 'Home' }} action={meta}>
        <div className="stat-row">
          <div className="stat"><b>{answered}</b>answered</div>
          <div className="stat"><b>{unanswered}</b>unanswered</div>
          <div className="stat"><b>{ip.flagged.length}</b>flagged</div>
        </div>
        <div className="grid-review">
          {questions.map((dq, k) => {
            const a = ip.answers[k] !== null
            const f = ip.flagged.includes(dq.id)
            const cls = [a && 'answered', f && 'flagged', k === ip.current && 'current'].filter(Boolean).join(' ')
            const label = `Question ${k + 1}, ${a ? 'answered' : 'unanswered'}${f ? ', flagged' : ''}`
            return <button key={dq.id} type="button" className={cls} aria-label={label} onClick={() => go(k)}>{k + 1}</button>
          })}
        </div>
        <p className="legend"><span>Tinted: answered</span><span>Amber ring: flagged</span><span>Tap a number to jump to it</span></p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={submit}>Submit exam</button>
          <button type="button" className="btn btn-ghost" onClick={() => setView('question')}>Back to questions</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" className="link-btn" onClick={abandon}>Abandon this attempt</button>
        </p>
      </Layout>
    )
  }

  return (
    <Layout title="Final exam" back={{ href: '#/', label: 'Home' }} action={meta}>
      <QuestionCard
        question={q} index={ip.current} total={total}
        selected={ip.answers[ip.current]} submitted={false} showFeedback={false}
        onSelect={(k) => change({ answers: ip.answers.map((v, j) => (j === ip.current ? k : v)) })}
      />
      <div className="exam-nav">
        <button type="button" className="btn btn-ghost" disabled={ip.current === 0} onClick={() => go(ip.current - 1)}>‹ Prev</button>
        <button type="button" className="btn btn-ghost btn-flag" aria-pressed={isFlagged} onClick={toggleFlag}>
          {isFlagged ? 'Flagged' : 'Flag'}
        </button>
        {ip.current < total - 1
          ? <button type="button" className="btn btn-ghost" onClick={() => go(ip.current + 1)}>Next ›</button>
          : <button type="button" className="btn btn-ghost" onClick={openReview}>Review</button>}
      </div>
      <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={openReview}>Review &amp; submit</button>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>{answered} of {total} answered · saved as you go</p>
    </Layout>
  )
}
