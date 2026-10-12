import Layout from '../components/Layout'
import ModuleListItem from '../components/ModuleListItem'
import ProgressRing from '../components/ProgressRing'
import { modules, moduleById } from '../content'
import { useProgress } from '../hooks/useProgress'
import { EXAM_SIZE, isExamUnlocked, isModuleUnlocked, nextModuleId } from '../lib/progress'

export default function Home() {
  const p = useProgress()
  const passed = modules.filter((m) => p.modules[m.id]?.passed).length
  const examOpen = isExamUnlocked(p, modules)
  const next = moduleById(nextModuleId(p, modules) ?? '')
  const inProgress = p.exam.inProgress
  const bestExam = p.exam.attempts.length ? Math.max(...p.exam.attempts.map((a) => a.score)) : null

  return (
    <Layout title="Insurance Foundations — built for Poppy">
      <p className="muted">Twelve short modules, then a final exam. Pass each quiz (8/10) to unlock the next.</p>

      <section className="card hero" aria-label="Your progress">
        <ProgressRing value={passed} max={modules.length} />
        <div>
          <p className="eyebrow">Progress</p>
          <p style={{ margin: 0 }}><strong>{passed} of {modules.length}</strong> modules passed</p>
        </div>
      </section>

      {examOpen ? (
        <a className="btn btn-primary btn-block" href="#/exam">{inProgress ? 'Resume the final exam' : 'Continue: Final exam'}</a>
      ) : next ? (
        <a className="btn btn-primary btn-block" href={`#/module/${next.id}`}>
          {passed === 0 ? 'Start here' : 'Continue'}: {next.title}
        </a>
      ) : null}

      <h2 style={{ marginTop: 32 }}>Modules</h2>
      <ul className="module-list">
        {modules.map((m) => {
          const mp = p.modules[m.id]
          const status = mp?.passed ? 'passed' : isModuleUnlocked(p, modules, m.id) ? 'available' : 'locked'
          return <li key={m.id}><ModuleListItem module={m} status={status} progress={mp} /></li>
        })}
      </ul>

      <section className={`card${examOpen ? ' callout' : ''}`}>
        <p className="eyebrow">Final exam</p>
        <h2>Put it all together</h2>
        {examOpen ? (
          <>
            <p>{EXAM_SIZE} questions from across every module. Pass mark 70%. Untimed — take it at your own pace.</p>
            {bestExam !== null && <p className="muted">Best so far: {Math.round((bestExam / EXAM_SIZE) * 100)}%</p>}
            <a className="btn btn-primary btn-block" href="#/exam">{inProgress ? 'Resume exam' : 'Start the exam'}</a>
          </>
        ) : (
          <p className="muted">Unlocks when all {modules.length} modules are passed.</p>
        )}
      </section>

      <footer className="page-foot">
        <a href="#/progress">Progress, export &amp; import</a>
      </footer>
    </Layout>
  )
}
