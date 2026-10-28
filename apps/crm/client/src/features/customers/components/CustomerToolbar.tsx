import { useEffect, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { CUSTOMER_STATUSES } from '../../../types/models'
import styles from './CustomerToolbar.module.css'

interface CustomerToolbarProps {
  total: number
  loading: boolean
  search: string
  status: string
  sort: string
  activeCount: number
  onFiltersChange: (next: { search?: string; status?: string; sort?: string }) => void
  onReset: () => void
}

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Sort by: Date Created' },
  { value: 'createdAt', label: 'Sort by: Oldest First' },
  { value: 'name', label: 'Sort by: Name (A–Z)' },
  { value: '-name', label: 'Sort by: Name (Z–A)' },
]

export function CustomerToolbar({
  total,
  loading,
  search,
  status,
  sort,
  activeCount,
  onFiltersChange,
  onReset,
}: CustomerToolbarProps) {
  // Local text keeps typing responsive; the debounced value drives the URL.
  const [draft, setDraft] = useState(search)
  const debounced = useDebouncedValue(draft)

  // Re-sync when the URL changes from elsewhere, such as the back button.
  useEffect(() => setDraft(search), [search])

  useEffect(() => {
    if (debounced !== search) onFiltersChange({ search: debounced })
    // onFiltersChange is stable; re-running on `search` would undo typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={styles.toolbar}>
      <p className={styles.total}>
        {loading ? 'Loading customers…' : `Total: ${total} ${total === 1 ? 'customer' : 'customers'}`}
      </p>

      <div className={styles.controls}>
        <div className={`${styles.pill} ${styles.search}`}>
          <Icon name="search" size={18} />
          <input
            className={styles.searchInput}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search customers"
            aria-label="Search customers"
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
            value={status}
            onChange={(event) => onFiltersChange({ status: event.target.value })}
          >
            <option value="">Filter: All statuses</option>
            {CUSTOMER_STATUSES.map((value) => (
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
