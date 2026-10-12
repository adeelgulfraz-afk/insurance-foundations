import type { ReactNode } from 'react'

interface LayoutProps {
  title?: string
  back?: { href: string; label: string }
  action?: ReactNode
  children: ReactNode
}

export default function Layout({ title, back, action, children }: LayoutProps) {
  return (
    <>
      {(back || action) && (
        <header className="topbar">
          <div className="topbar-inner">
            {back ? <a className="back" href={back.href}>‹ {back.label}</a> : <span />}
            {action}
          </div>
        </header>
      )}
      <main>
        {title && <h1>{title}</h1>}
        {children}
      </main>
    </>
  )
}
