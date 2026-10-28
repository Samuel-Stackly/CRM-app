import { useLocation } from 'react-router-dom'

import { NAV_ITEMS } from '../layouts/navigation'

/** Stands in for every section whose feature increment has not landed yet. */
export function ComingSoonPage() {
  const { pathname } = useLocation()
  const label = NAV_ITEMS.find((item) => item.to === pathname)?.label ?? 'This section'

  return (
    <div className="grid min-h-[50vh] place-items-center py-2">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">{label}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Not built yet. This section arrives in a later increment.
        </p>
      </div>
    </div>
  )
}
