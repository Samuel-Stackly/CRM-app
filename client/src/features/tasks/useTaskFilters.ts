import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface TaskFilters {
  done: string
  priority: string
  overdue: string
  search: string
  sort: string
  page: number
  setFilters: (
    next: Partial<Record<'done' | 'priority' | 'overdue' | 'search' | 'sort', string>>,
  ) => void
  setPage: (page: number) => void
  reset: () => void
  activeCount: number
}

/** Task list state, held in the URL so a refresh reproduces the same view. */
export function useTaskFilters(): TaskFilters {
  const [searchParams, setSearchParams] = useSearchParams()

  const done = searchParams.get('done') ?? ''
  const priority = searchParams.get('priority') ?? ''
  const overdue = searchParams.get('overdue') ?? ''
  const search = searchParams.get('search') ?? ''
  const sort = searchParams.get('sort') ?? 'dueDate'
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1

  const setFilters = useCallback(
    (next: Partial<Record<'done' | 'priority' | 'overdue' | 'search' | 'sort', string>>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)

          for (const [key, value] of Object.entries(next)) {
            if (value) params.set(key, value)
            else params.delete(key)
          }

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

  return {
    done,
    priority,
    overdue,
    search,
    sort,
    page,
    setFilters,
    setPage,
    reset,
    activeCount: [done, priority, overdue, search].filter(Boolean).length,
  }
}
