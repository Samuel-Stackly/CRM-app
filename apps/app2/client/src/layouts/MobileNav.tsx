import { NavLink } from 'react-router-dom'

import { Icon } from '../components/ui/Icon'
import { NAV_ITEMS } from './navigation'

/**
 * Bottom tab bar, matching the 393px mobile frame in the export.
 *
 * Hidden from 1024px up, where the rail takes over. It duplicates the rail's
 * destinations rather than offering a reduced set, because the export shows
 * five tabs for five sections.
 */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden"
    >
      <ul className="flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          // min-w-0 lets the tab shrink below its label's intrinsic width.
          // Without it, five labels are wider than a 393px viewport and the
          // whole page gains a horizontal scrollbar.
          <li key={item.to} className="min-w-0 flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] transition-colors',
                  isActive ? 'text-ink' : 'text-ink-muted',
                ].join(' ')
              }
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
