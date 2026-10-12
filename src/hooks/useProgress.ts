import { useSyncExternalStore } from 'react'
import { clear, load, save, type Progress } from '../lib/progress'

let state: Progress = load()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const progressStore = {
  get: () => state,
  update(fn: (p: Progress) => Progress) { state = fn(state); save(state); emit() },
  replace(p: Progress) { state = p; save(state); emit() },
  reset() { clear(); state = load(); emit() },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
}

export const useProgress = (): Progress => useSyncExternalStore(progressStore.subscribe, progressStore.get)
