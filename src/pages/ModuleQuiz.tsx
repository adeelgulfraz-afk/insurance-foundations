import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import QuestionCard from '../components/QuestionCard'
import { moduleById, modules } from '../content'
import { progressStore, useProgress } from '../hooks/useProgress'
import { draw, moduleBank } from '../lib/questions'
import { isExamUnlocked, isModuleUnlocked, QUIZ_PASS, QUIZ_SIZE, recordQuizResult } from '../lib/progress'
import type { Module } from '../types'
import { LockedModule } from './ModuleRead'
import NotFound from './NotFound'

export default function ModuleQuiz({ id }: { id: string }) {
  const p = useProgress()
  const [run, setRun] = useState(0)
  const m = moduleById(id)
  if (!m) return <NotFound />
  if (!isModuleUnlocked(p, modules, id)) return <LockedModule m={m} />
  // A new key on retry (or on a different module) gives a completely fresh attempt and draw.
  return <QuizRun key={`${id}-${run}`} m={m} onRetry={() => { setRun((r) => r + 1); window.scrollTo(0, 0) }} />
}

function QuizRun({ m, onRetry }: { m: Module; onRetry: () => void }) {
  const p = useProgress()
  const [questions] = useState(() => draw(moduleBank(m), QUIZ_SIZE))
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(questions.length).fill(null))
  const [result, setResult] = useState<number | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const scoreRef = useRef<HTMLHeadingElement>(null)
  const submitted = answers[i] !== null

  useEffect(() => { if (submitted) nextRef.current?.focus() }, [submitted, i])
  // "See score" unmounts with the question; land focus on the score so it is announced.
  useEffect(() => { if (result !== null) scoreRef.current?.focus() }, [result])

  const choose = (k: number) => {
    if (submitted) return // one tap submits; no changing it afterwards
    setAnswers((a) => a.map((v, j) => (j === i ? k : v)))
  }

  const next = () => {
    if (i < questions.length - 1) { setI(i + 1); window.scrollTo(0, 0); return }
    const s = answers.filter((a, k) => a === questions[k].answerIndex).length
    progressStore.update((prev) => recordQuizResult(prev, m.id, s))
    setResult(s)
    window.scrollTo(0, 0)
  }

  const back = { href: `#/module/${m.id}`, label: 'Reading' }
  const title = `${m.order}. ${m.title}`

  if (result !== null) {
    const passedNow = result >= QUIZ_PASS
    const nextMod = modules[modules.indexOf(m) + 1]
    const allPassed = isExamUnlocked(p, modules)
    const headline = passedNow
      ? `Nice — ${result}/${QUIZ_SIZE}.${nextMod ? ` On to ${nextMod.title}.` : allPassed ? ' That’s all twelve — the final exam is open.' : ''}`
      : `${result}/${QUIZ_SIZE} — not quite. You need ${QUIZ_PASS}. Have another go, the questions change each time.`
    return (
      <Layout title={title} back={back}>
        <section className="card">
          <p className="eyebrow">Quiz score</p>
          <h2 ref={scoreRef} tabIndex={-1} className={`score-big ${passedNow ? 'pass' : 'fail'}`}>{result}/{QUIZ_SIZE}</h2>
          <p>{headline}</p>
        </section>
        <div className="btn-row">
          {p.modules[m.id]?.passed && nextMod && <a className="btn btn-primary" href={`#/module/${nextMod.id}`}>Next module</a>}
          {allPassed && <a className="btn btn-primary" href="#/exam">Final exam</a>}
          <button type="button" className={`btn ${passedNow ? 'btn-ghost' : 'btn-primary'}`} onClick={onRetry}>Retry (new questions)</button>
          <a className="btn btn-ghost" href={`#/module/${m.id}`}>Back to reading</a>
          <a className="btn btn-ghost" href="#/">Home</a>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={title} back={back}>
      <div className="dots" aria-hidden="true">
        {questions.map((_, k) => <span key={k} className={`dot${k === i ? ' current' : answers[k] !== null ? ' done' : ''}`} />)}
      </div>
      <QuestionCard
        question={questions[i]} index={i} total={questions.length}
        selected={answers[i]} submitted={submitted} showFeedback onSelect={choose}
      />
      {submitted && (
        <button ref={nextRef} type="button" className="btn btn-primary btn-block" onClick={next}>
          {i < questions.length - 1 ? 'Next question' : 'See score'}
        </button>
      )}
    </Layout>
  )
}
