import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Reads and writes list filters through the URL query string.
 *
 * The URL is the single source of truth — no filter value is mirrored in local
 * state — which is what makes a refresh, a copied link and the browser back
 * button all reproduce the same view.
 *
 * The filter axes are supplied by the caller rather than fixed, so products can
 * filter on search plus category while another list uses a different set,
 * without a second near-identical hook.
 */
export interface UrlFilters<Key extends string> {
  /** Current value of each requested filter; '' when absent from the URL. */
  values: Record<Key, string>
  page: number
  /** Changing any filter resets to page 1. */
  setFilters: (next: Partial<Record<Key, string>>) => void
  setPage: (page: number) => void
  reset: () => void
  /** How many filters are currently narrowing the list. */
  activeCount: number
}

export function useUrlFilters<Key extends string>(keys: readonly Key[]): UrlFilters<Key> {
  const [searchParams, setSearchParams] = useSearchParams()

  // Derived from the URL on every render, so back/forward restore the view
  // without any synchronisation step that could fire a duplicate request.
  const serialised = searchParams.toString()

  const values = useMemo(() => {
    const params = new URLSearchParams(serialised)
    return Object.fromEntries(
      keys.map((key) => [key, params.get(key) ?? '']),
    ) as Record<Key, string>
    // `keys` is a literal array at every call site; serialising is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised, keys.join(',')])

  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1

  const setFilters = useCallback(
    (next: Partial<Record<Key, string>>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)

          for (const [key, value] of Object.entries(next)) {
            if (value) params.set(key, value as string)
            else params.delete(key)
          }

          // A narrowed result set rarely has as many pages, so staying on the
          // old page would strand the user on an empty one.
          params.delete('page')
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current)
        if (nextPage <= 1) params.delete('page')
        else params.set('page', String(nextPage))
        return params
      })
    },
    [setSearchParams],
  )

  const reset = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams])

  const activeCount = useMemo(
    () => keys.filter((key) => values[key]).length,
    [keys, values],
  )

  return { values, page, setFilters, setPage, reset, activeCount }
}
