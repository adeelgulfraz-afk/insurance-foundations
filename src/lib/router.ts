export type Route =
  | { name: 'home' }
  | { name: 'module'; id: string }
  | { name: 'quiz'; id: string }
  | { name: 'exam' }
  | { name: 'examResults' }
  | { name: 'progress' }
  | { name: 'notFound' }

const ID = /^m\d{2}$/

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const parts = path.split('/').filter(Boolean)
  if (!path.startsWith('/') && path !== '') return { name: 'notFound' }
  if (parts.length === 0) return { name: 'home' }
  const [a, b, c] = parts
  if (a === 'module' && b && ID.test(b) && parts.length === 2) return { name: 'module', id: b }
  if (a === 'module' && b && ID.test(b) && c === 'quiz' && parts.length === 3) return { name: 'quiz', id: b }
  if (a === 'exam' && parts.length === 1) return { name: 'exam' }
  if (a === 'exam' && b === 'results' && parts.length === 2) return { name: 'examResults' }
  if (a === 'progress' && parts.length === 1) return { name: 'progress' }
  return { name: 'notFound' }
}

export function routePath(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'module': return `#/module/${r.id}`
    case 'quiz': return `#/module/${r.id}/quiz`
    case 'exam': return '#/exam'
    case 'examResults': return '#/exam/results'
    case 'progress': return '#/progress'
    case 'notFound': return '#/'
  }
}

export function navigate(path: string): void {
  window.location.hash = path
}
