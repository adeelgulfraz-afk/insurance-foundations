import { useEffect, useRef } from 'react'
import type { Track } from '../lib/narration'

interface Props {
  tracks: Track[]
  moduleId: string
  moduleTitle: string
  index: number
  /** Bumped by the parent whenever playback should start (also when re-selecting the current track). */
  playKey: number
  onSelect: (i: number) => void
}

export default function AudioPlayer({ tracks, moduleId, moduleTitle, index, playKey, onSelect }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const t = tracks[index]
  const last = tracks.length - 1

  // Start playing when the parent asks (section button, prev/next, auto-advance). playKey 0 = page just opened: stay silent.
  useEffect(() => {
    if (playKey === 0 || !ref.current) return
    ref.current.load()
    ref.current.play().catch(() => { /* autoplay refused: the user can press play on the controls */ })
  }, [index, playKey])

  // Lock-screen title and headphone buttons on phones.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: moduleTitle, album: 'Insurance Foundations' })
    navigator.mediaSession.setActionHandler('previoustrack', index > 0 ? () => onSelect(index - 1) : null)
    navigator.mediaSession.setActionHandler('nexttrack', index < last ? () => onSelect(index + 1) : null)
  }, [index, last, moduleTitle, onSelect, t.title])

  return (
    <section className="card narration" aria-label="Listen to this module">
      <div className="narration-head">
        <button type="button" className="btn btn-ghost" onClick={() => onSelect(index - 1)} disabled={index === 0} aria-label="Previous part">‹</button>
        <div className="narration-title">
          <p className="eyebrow">Listen · part {index + 1} of {tracks.length}</p>
          <strong>{t.title}</strong>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => onSelect(index + 1)} disabled={index === last} aria-label="Next part">›</button>
      </div>
      <audio
        ref={ref}
        controls
        preload="none"
        playsInline
        src={`${import.meta.env.BASE_URL}audio/${moduleId}/${t.file}`}
        onEnded={() => { if (index < last) onSelect(index + 1) }}
      />
    </section>
  )
}
