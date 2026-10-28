import { useEffect, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { DEAL_STAGES } from '../../../types/models'
import type { DealView } from '../useDealFilters'
import styles from './DealToolbar.module.css'

interface DealToolbarProps {
  summary: string
  view: DealView
  stage: string
  search: string
  sort: string
  activeCount: number
  onFiltersChange: (next: { stage?: string; search?: string; sort?: string; view?: string }) => void
  onReset: () => void
}

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Sort by: Date Created' },
  { value: 'createdAt', label: 'Sort by: Oldest First' },
  { value: '-value', label: 'Sort by: Value (High)' },
  { value: 'value', label: 'Sort by: Value (Low)' },
  { value: 'expectedCloseDate', label: 'Sort by: Close Date' },
]

export function DealToolbar({
  summary,
  view,
  stage,
  search,
  sort,
  activeCount,
  onFiltersChange,
  onReset,
}: DealToolbarProps) {
  const [draft, setDraft] = useState(search)
  const debounced = useDebouncedValue(draft)

  useEffect(() => setDraft(search), [search])

  useEffect(() => {
    if (debounced !== search) onFiltersChange({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={styles.toolbar}>
      <p className={styles.total}>{summary}</p>

      <div className={styles.controls}>
        <div className={styles.toggle} role="group" aria-label="View">
          <button
            type="button"
            className={`${styles.toggleButton} ${view === 'board' ? styles.toggleActive : ''}`}
            onClick={() => onFiltersChange({ view: 'board' })}
            aria-pressed={view === 'board'}
          >
            Pipeline
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${view === 'list' ? styles.toggleActive : ''}`}
            onClick={() => onFiltersChange({ view: 'list' })}
            aria-pressed={view === 'list'}
          >
            List
          </button>
        </div>

        <div className={`${styles.pill} ${styles.search}`}>
          <Icon name="search" size={18} />
          <input
            className={styles.searchInput}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search deals"
            aria-label="Search deals"
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

        {/* Stage is a column in board view, so the filter applies to the list. */}
        {view === 'list' ? (
          <label className={styles.pill}>
            <span className="srOnly">Filter by stage</span>
            <select
              className={styles.select}
              value={stage}
              onChange={(event) => onFiltersChange({ stage: event.target.value })}
            >
              <option value="">Filter: All stages</option>
              {DEAL_STAGES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {activeCount > 0 ? (
          <button type="button" className={styles.clear} onClick={onReset}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
