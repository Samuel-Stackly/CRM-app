import type { IconName } from '../components/ui/Icon'

export interface NavItem {
  to: string
  label: string
  icon: IconName
}

/**
 * The primary navigation, shared by the desktop rail and the mobile tab bar so
 * the two cannot drift apart.
 *
 * Customers is still a placeholder — it has no endpoint behind it yet.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: 'overview' },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/customers', label: 'Customers', icon: 'customers' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
]
