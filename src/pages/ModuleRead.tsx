import { useCallback, useEffect, useState } from 'react'
import AudioPlayer from '../components/AudioPlayer'
import Layout from '../components/Layout'
import Markdown from '../components/Markdown'
import { moduleById, modules } from '../content'
import { progressStore, useProgress } from '../hooks/useProgress'
import { moduleTracks } from '../lib/narration'
import { isModuleUnlocked } from '../lib/progress'
import type { Module } from '../types'
import NotFound from './NotFound'

/** Shown instead of a module page while it is still locked. Shared with ModuleQuiz. */
export function LockedModule({ m }: { m: Module }) {
  const prev = modules[modules.indexOf(m) - 1]
  return (
    <Layout title={`${m.order}. ${m.title}`} back={{ href: '#/', label: 'Home' }}>
      <p>This module unlocks when you pass {prev ? <strong>{prev.title}</strong> : 'the one before it'}.</p>
      <a className="btn btn-primary" href="#/">Back to home</a>
    </Layout>
  )
}

const blank = { passed: false, bestScore: 0, attempts: 0, lastAttemptAt: '' }

export default function ModuleRead({ id }: { id: string }) {
  const p = useProgress()
  const m = moduleById(id)
  const open = !!m && isModuleUnlocked(p, modules, id)
  const [track, setTrack] = useState(0)
  const [playKey, setPlayKey] = useState(0)
  const listen = useCallback((i: number) => { setTrack(i); setPlayKey((k) => k + 1) }, [])

  // Remember where she was, and restore it on the way back in.
  useEffect(() => {
    if (!open) return
    progressStore.update((s) => ({ ...s, lastVisited: id }))
    const saved = progressStore.get().modules[id]?.scrollPos ?? 0
    const raf = requestAnimationFrame(() => window.scrollTo(0, saved))
    let timer: number | undefined
    let lastY = saved
    const write = () => {
      timer = undefined
      progressStore.update((s) => ({ ...s, modules: { ...s.modules, [id]: { ...(s.modules[id] ?? blank), scrollPos: lastY } } }))
    }
    // Record Y in the listener: by unmount the next page is in the DOM and scrollY may already be clamped.
    const onScroll = () => { lastY = Math.round(window.scrollY); clearTimeout(timer); timer = window.setTimeout(write, 300) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      if (timer !== undefined) { clearTimeout(timer); write() }
    }
  }, [id, open])

  if (!m) return <NotFound />
  if (!open) return <LockedModule m={m} />
  const tracks = moduleTracks(m)

  return (
    <Layout title={`${m.order}. ${m.title}`} back={{ href: '#/', label: 'Home' }}>
      <p className="muted">~{m.estimatedMinutes} min read</p>

      <AudioPlayer tracks={tracks} moduleId={m.id} moduleTitle={m.title} index={track} playKey={playKey} onSelect={listen} />

      <section className="card recap">
        <h2>Quick recap <PlayButton label="Quick recap" onClick={() => listen(0)} /></h2>
        <ul>{m.recap.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </section>

      {m.sections.map((s, i) => (
        <article key={i}>
          <h2>{s.heading} <PlayButton label={s.heading} onClick={() => listen(i + 1)} /></h2>
          <Markdown body={s.body} />
        </article>
      ))}

      <section className="card callout">
        <p className="eyebrow">Why this matters for a broker <PlayButton label="Why this matters for a broker" onClick={() => listen(tracks.length - 1)} /></p>
        <p>{m.whyItMatters}</p>
      </section>

      <div className="sticky-cta">
        <a className="btn btn-primary" href={`#/module/${id}/quiz`}>Take the quiz</a>
      </div>
    </Layout>
  )
}

function PlayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="btn-play" aria-label={`Listen to ${label}`} onClick={onClick}>{'▶︎'}</button>
}
