import { useEffect, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { TASK_PRIORITIES } from '../../../types/models'
import styles from './TaskToolbar.module.css'

interface TaskToolbarProps {
  total: number
  loading: boolean
  done: string
  priority: string
  overdue: string
  search: string
  sort: string
  activeCount: number
  onFiltersChange: (next: {
    done?: string
    priority?: string
    overdue?: string
    search?: string
    sort?: string
  }) => void
  onReset: () => void
}

const SORT_OPTIONS = [
  { value: 'dueDate', label: 'Sort by: Due Date' },
  { value: '-dueDate', label: 'Sort by: Due Date (Latest)' },
  { value: 'priority', label: 'Sort by: Priority' },
  { value: '-createdAt', label: 'Sort by: Date Created' },
]

export function TaskToolbar({
  total,
  loading,
  done,
  priority,
  overdue,
  search,
  sort,
  activeCount,
  onFiltersChange,
  onReset,
}: TaskToolbarProps) {
  const [draft, setDraft] = useState(search)
  const debounced = useDebouncedValue(draft)

  useEffect(() => setDraft(search), [search])

  useEffect(() => {
    if (debounced !== search) onFiltersChange({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={styles.toolbar}>
      <p className={styles.total}>
        {loading ? 'Loading tasks…' : `Total: ${total} ${total === 1 ? 'task' : 'tasks'}`}
      </p>

      <div className={styles.controls}>
        <div className={`${styles.pill} ${styles.search}`}>
          <Icon name="search" size={18} />
          <input
            className={styles.searchInput}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
          />
        </div>

        <label className={styles.pill}>
          <span className="srOnly">Sort by</span>
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => onFiltersChange({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.pill}>
          <span className="srOnly">Filter by status</span>
          <select
            className={styles.select}
            value={overdue === 'true' ? 'overdue' : done}
            onChange={(event) => {
              const value = event.target.value
              // Overdue is a derived filter on the server, not a stored field,
              // so it is sent instead of `done` rather than alongside it.
              if (value === 'overdue') onFiltersChange({ overdue: 'true', done: '' })
              else onFiltersChange({ overdue: '', done: value })
            }}
          >
            <option value="">Filter: All tasks</option>
            <option value="false">Open</option>
            <option value="true">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>

        <label className={styles.pill}>
          <span className="srOnly">Filter by priority</span>
          <select
            className={styles.select}
            value={priority}
            onChange={(event) => onFiltersChange({ priority: event.target.value })}
          >
            <option value="">Filter: All priorities</option>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value[0]?.toUpperCase()}
                {value.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {activeCount > 0 ? (
          <button type="button" className={styles.clear} onClick={onReset}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
