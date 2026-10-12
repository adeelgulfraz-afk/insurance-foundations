import type { Module } from '../types'
import type { ModuleProgress } from '../lib/progress'

export type ModuleStatus = 'locked' | 'available' | 'passed'

const BADGE: Record<ModuleStatus, [string, string]> = {
  locked: ['badge-locked', 'Locked'],
  available: ['badge-ready', 'Ready'],
  passed: ['badge-passed', 'Passed'],
}

export default function ModuleListItem({ module: m, status, progress }: { module: Module; status: ModuleStatus; progress?: ModuleProgress }) {
  const [badgeClass, badgeText] = BADGE[status]
  const meta = [`~${m.estimatedMinutes} min`, progress?.attempts ? `best ${progress.bestScore}/10` : ''].filter(Boolean).join(' · ')
  const inner = (
    <>
      <span className="list-num" aria-hidden="true">{m.order}</span>
      <span className="list-body">
        <span className="list-title">{m.title}</span>
        <span className="list-meta">{meta}</span>
      </span>
      <span className={`badge ${badgeClass}`}>{badgeText}</span>
    </>
  )
  return status === 'locked'
    ? <div className="list-item" aria-disabled="true">{inner}</div>
    : <a className="list-item" href={`#/module/${m.id}`}>{inner}</a>
}
