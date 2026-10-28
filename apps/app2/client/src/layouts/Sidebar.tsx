import { NavLink } from 'react-router-dom'

import { Icon } from '../components/ui/Icon'
import { NAV_ITEMS } from './navigation'

interface SidebarProps {
  /** Mobile only: the drawer is closed after a navigation. */
  onNavigate?: () => void
}

/**
 * The left rail.
 *
 * Rendered inside the desktop grid column at >=1024px and inside a slide-over
 * drawer below it, so it takes no responsibility for its own positioning.
 */
export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
          S
        </span>
        <span className="text-base font-semibold tracking-tight">ShopDesk</span>
      </div>

      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-fill-strong font-medium text-ink'
                      : 'text-ink-muted hover:bg-fill hover:text-ink',
                  ].join(' ')
                }
              >
                <Icon name={item.icon} className="size-5 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
