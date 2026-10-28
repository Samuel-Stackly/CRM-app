import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="grid min-h-[50vh] place-items-center py-2">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          That URL does not match anything in ShopDesk.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block rounded-control bg-fill px-3 py-1.5 text-sm hover:bg-fill-strong"
        >
          Back to overview
        </Link>
      </div>
    </div>
  )
}
