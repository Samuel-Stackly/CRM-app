import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Icon } from '../components/ui/Icon'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NAV_ITEMS } from './navigation'

/** Page title for the breadcrumb, from the leading path segment. */
function resolveTitle(pathname: string): string {
  const segment = `/${pathname.split('/').filter(Boolean)[0] ?? ''}`
  return NAV_ITEMS.find((item) => item.to === segment)?.label ?? 'ShopDesk'
}

export function AppShell() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Escape closes the drawer; without it the only way out on a phone is the
  // scrim, which is easy to miss behind a full-height panel.
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--spacing-rail)_1fr]">
      <aside className="hidden border-r border-line lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-rail max-w-[80vw] bg-surface shadow-xl">
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation"
              className="absolute right-2 top-3 grid size-9 place-items-center rounded-control text-ink-muted hover:bg-fill"
            >
              <Icon name="close" className="size-5" />
            </button>
            <Sidebar onNavigate={closeMenu} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <Topbar title={resolveTitle(pathname)} onOpenMenu={() => setMenuOpen(true)} />
        {/* The bottom padding clears the mobile tab bar, which is fixed. */}
        <main className="min-w-0 flex-1 px-4 pb-24 lg:px-7 lg:pb-7">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
