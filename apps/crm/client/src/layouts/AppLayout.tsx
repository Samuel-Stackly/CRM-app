import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import styles from './AppLayout.module.css'

/** Page titles for the topbar, keyed by the leading path segment. */
const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  deals: 'Deals',
  tasks: 'Tasks',
  'coming-soon': 'Coming Soon',
}

function resolveTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const isDetail = pathname.split('/').filter(Boolean).length > 1

  const base = TITLES[segment] ?? 'Mini CRM'
  if (!isDetail) return base

  // "Customers" -> "Customer Details", matching the design's detail screens.
  return `${base.replace(/s$/, '')} Details`
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className={styles.shell}>
      <Sidebar />
      <Topbar title={resolveTitle(pathname)} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
