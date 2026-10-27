import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router'

import { AppHeader } from './app-header'
import { SidebarNav } from './sidebar-nav'

/** Título de la pestaña a partir del `handle.title` de la ruta activa. */
function useDocumentTitle() {
  const matches = useMatches()
  const title = [...matches]
    .reverse()
    .map((m) => (m.handle as { title?: string } | undefined)?.title)
    .find(Boolean)
  useEffect(() => {
    document.title = title ? `${title} · IT Service Manager` : 'IT Service Manager'
  }, [title])
}

export function AppLayout() {
  useDocumentTitle()
  return (
    <div className="min-h-svh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarNav />
      </aside>
      <div className="lg:pl-64">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
