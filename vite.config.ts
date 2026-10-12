import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GITHUB_REPOSITORY is "owner/repo" in Actions. A user/org site (repo named
// owner.github.io) is served from "/", every other repo from "/repo/".
function pagesBase(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (!repo || repo.endsWith('.github.io')) return '/'
  return `/${repo}/`
}

export default defineConfig({
  plugins: [react()],
  base: pagesBase(),
})
