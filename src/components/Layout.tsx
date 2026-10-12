import type { ReactNode, Ref } from 'react'

interface LayoutProps {
  title?: string
  back?: { href: string; label: string }
  action?: ReactNode
  titleRef?: Ref<HTMLHeadingElement>
  children: ReactNode
}

export default function Layout({ title, back, action, titleRef, children }: LayoutProps) {
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
        {title && <h1 ref={titleRef} tabIndex={-1}>{title}</h1>}
        {children}
      </main>
    </>
  )
}
