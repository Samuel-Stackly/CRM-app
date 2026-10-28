import type { SVGProps } from 'react'

/**
 * Icon set.
 *
 * Drawn as 20x20 stroked paths matching the weight used in the SnowUI export.
 * Inline rather than from a package: the scaffold needs eight glyphs, and an
 * icon dependency would be more bytes than the glyphs themselves.
 */
export type IconName =
  | 'overview'
  | 'products'
  | 'orders'
  | 'customers'
  | 'settings'
  | 'profile'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'close'
  | 'search'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'more'
  | 'trendUp'
  | 'trendDown'
  | 'inbox'
  | 'alert'
  | 'check'

const PATHS: Record<IconName, string> = {
  overview: 'M3 10.5 10 4l7 6.5M5 9v7h10V9',
  products: 'M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7ZM3 6.5 10 10m0 0 7-3.5M10 10v7',
  orders: 'M6 3h8l2 4v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7l2-4ZM4 7h12M8 10a2 2 0 0 0 4 0',
  customers: 'M13 16v-1a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 7v-1a3 3 0 0 0-2-2.8M13 3.2a3 3 0 0 1 0 5.6',
  settings: 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6-2.5a6 6 0 0 1-.1 1l1.4 1.1-1.5 2.6-1.7-.6a6 6 0 0 1-1.7 1l-.3 1.8H8.9l-.3-1.8a6 6 0 0 1-1.7-1l-1.7.6-1.5-2.6L5.1 11a6 6 0 0 1 0-2L3.7 7.9l1.5-2.6 1.7.6a6 6 0 0 1 1.7-1l.3-1.8h3.2l.3 1.8a6 6 0 0 1 1.7 1l1.7-.6 1.5 2.6L15.9 9c.1.3.1.7.1 1Z',
  profile: 'M16 17v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 15.5V17M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  sun: 'M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2m12.2-4.2-1 1m-6.4 6.4-1 1m8.4 0-1-1M5.8 5.8l1 1',
  moon: 'M16.5 11.5A7 7 0 0 1 8.5 3.5a7 7 0 1 0 8 8Z',
  menu: 'M3 6h14M3 10h14M3 14h14',
  close: 'm5 5 10 10M15 5 5 15',
  search: 'M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12Zm4.5-1.5L17 17',
  chevronDown: 'm6 8 4 4 4-4',
  chevronLeft: 'm12 5-5 5 5 5',
  chevronRight: 'm8 5 5 5-5 5',
  more: 'M5 10h.01M10 10h.01M15 10h.01',
  trendUp: 'm4 13 4-4 3 3 5-5m0 0h-3.5m3.5 0v3.5',
  trendDown: 'm4 7 4 4 3-3 5 5m0 0h-3.5m3.5 0v-3.5',
  inbox: 'M3 12h4l1 2h4l1-2h4M3 12l2-7h10l2 7v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z',
  alert: 'M10 7v4m0 3h.01M10 2.5 2.5 16h15L10 2.5Z',
  check: 'm4 10.5 4 4 8-9',
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
