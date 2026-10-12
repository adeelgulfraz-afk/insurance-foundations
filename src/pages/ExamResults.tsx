import Layout from '../components/Layout'
import { moduleById } from '../content'
import { useProgress } from '../hooks/useProgress'
import { EXAM_PASS_FRACTION } from '../lib/progress'

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

export default function ExamResults() {
  const p = useProgress()
  const last = p.exam.attempts.at(-1)

  if (!last) {
    return (
      <Layout title="Exam results" back={{ href: '#/', label: 'Home' }}>
        <p>No exam attempts yet.</p>
        <a className="btn btn-primary" href="#/exam">Go to the exam</a>
      </Layout>
    )
  }

  const rows = Object.entries(last.byModule)
    .map(([id, r]) => ({ id, ...r, pct: r.total ? r.correct / r.total : 0, title: id === 'mixed' ? 'Mixed scenarios' : moduleById(id)?.title ?? id }))
    .sort((a, b) => a.pct - b.pct)
  const total = rows.reduce((s, r) => s + r.total, 0)
  const passed = total > 0 && last.score / total >= EXAM_PASS_FRACTION
  const pct = total ? Math.round((last.score / total) * 100) : 0

  return (
    <Layout title="Exam results" back={{ href: '#/', label: 'Home' }}>
      <section className="card">
        <p className="eyebrow">Final exam</p>
        <p className={`score-big ${passed ? 'pass' : 'fail'}`}>{pct}%</p>
        <p><strong>{last.score} of {total}</strong> correct.{' '}
          {passed ? 'Passed — that’s the whole course. Brilliant.' : 'Not this time — 70% needed. Your weakest modules are listed first.'}
        </p>
        <p className="muted small">Started {when(last.startedAt)} · Finished {when(last.finishedAt)}</p>
      </section>

      <section className="card">
        <h2>By module</h2>
        <ul className="breakdown">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="breakdown-head">
                <span>{r.title}</span>
                <strong>{r.correct}/{r.total}</strong>
              </div>
              <div className="bar" aria-hidden="true"><span style={{ width: `${Math.round(r.pct * 100)}%` }} /></div>
              {r.id !== 'mixed' && moduleById(r.id) && <a href={`#/module/${r.id}`} className="small revise">Revise this module</a>}
            </li>
          ))}
        </ul>
      </section>

      <div className="btn-row">
        <a className="btn btn-primary" href="#/exam">Retake exam</a>
        <a className="btn btn-ghost" href="#/">Home</a>
      </div>
    </Layout>
  )
}
