import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { Icon, type IconName } from '../components/icons/Icon'
import styles from './Sidebar.module.css'

interface NavItem {
  path: string
  icon: IconName
  label: string
  /**
   * Distinguishes the three rail items that share the /coming-soon path.
   * NavLink matches on pathname alone, so without this they would all
   * highlight at once.
   */
  from?: string
  badge?: boolean
}

/**
 * Rail order is taken from the design. Items 1–4 were confirmed by which icon
 * is highlighted on each screen; 5–7 have no corresponding screen and lead to
 * the Coming Soon page (DESIGN_SPEC §3.2).
 */
const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', icon: 'grid', label: 'Dashboard' },
  { path: '/deals', icon: 'briefcase', label: 'Deals' },
  { path: '/customers', icon: 'people', label: 'Customers' },
  { path: '/tasks', icon: 'checklist', label: 'Tasks' },
  { path: '/coming-soon', from: 'calendar', icon: 'calendar', label: 'Calendar' },
  { path: '/coming-soon', from: 'notifications', icon: 'bell', label: 'Notifications', badge: true },
  { path: '/coming-soon', from: 'settings', icon: 'gear', label: 'Settings' },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')

  function isActive(item: NavItem): boolean {
    // Sections also own their detail routes: /customers/123 keeps Customers lit.
    const pathMatches = pathname === item.path || pathname.startsWith(`${item.path}/`)
    if (!pathMatches) return false

    // Items sharing a path are told apart by the `from` parameter.
    return item.from === undefined || item.from === from
  }

  return (
    <aside className={styles.rail}>
      <div className={styles.logo} aria-hidden="true">
        C
      </div>

      <nav className={styles.nav} aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const to = item.from ? `${item.path}?from=${item.from}` : item.path

          return (
            <Link
              key={item.label}
              to={to}
              className={`${styles.item} ${active ? styles.active : ''}`}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              <Icon name={item.icon} />
              <span className="srOnly">{item.label}</span>
              {item.badge ? <span className={styles.badge} /> : null}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
