import { Icon } from '../components/ui/Icon'
import { useAuth } from '../features/auth/useAuth'
import { useTheme } from '../theme/useTheme'

interface TopbarProps {
  title: string
  onOpenMenu: () => void
}

/**
 * Breadcrumb, search affordance and theme switch.
 *
 * The export shows both a light and a dark frame of every screen, so the theme
 * toggle is part of the shell rather than a setting hidden on another page.
 */
export function Topbar({ title, onOpenMenu }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()

  return (
    <header className="flex h-topbar items-center gap-3 px-4 lg:px-7">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-fill hover:text-ink lg:hidden"
      >
        <Icon name="menu" className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <span className="text-ink-muted">Dashboards</span>
        <span className="text-ink-muted">/</span>
        <span className="font-medium">{title}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-control bg-fill px-3 py-1.5 text-sm text-ink-muted sm:flex">
          <Icon name="search" className="size-4" />
          <span>Search</span>
          <kbd className="ml-6 text-xs">⌘K</kbd>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-fill hover:text-ink"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="size-5" />
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-1">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-full bg-fill text-xs font-medium text-ink-muted"
            >
              {user.name.charAt(0)}
            </span>
            <span className="hidden text-sm font-medium md:inline">{user.name}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-control px-2 py-1 text-sm text-ink-muted hover:bg-fill hover:text-ink"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
