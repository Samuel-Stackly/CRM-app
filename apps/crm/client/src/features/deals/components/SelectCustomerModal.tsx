import { useCallback, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { Avatar } from '../../../components/ui/Avatar'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Modal } from '../../../components/ui/Modal'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import { useAsync } from '../../../hooks/useAsync'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import type { Customer } from '../../../types/models'
import { dealsApi } from '../api'
import styles from './SelectCustomerModal.module.css'

interface SelectCustomerModalProps {
  onSelect: (customer: Customer) => void
  onClose: () => void
}

/** Customer picker, loaded from the real customers endpoint. */
export function SelectCustomerModal({ onSelect, onClose }: SelectCustomerModalProps) {
  const [draft, setDraft] = useState('')
  const search = useDebouncedValue(draft)

  const fetcher = useCallback(
    (signal: AbortSignal) => dealsApi.customers(search, signal),
    [search],
  )

  const { data, status, error, reload } = useAsync(fetcher)

  return (
    <Modal title="Select Customer" size="sm" onClose={onClose}>
      <div className={styles.search}>
        <Icon name="search" size={18} />
        <input
          className={styles.input}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search customers"
          aria-label="Search customers"
        />
      </div>

      {status === 'error' ? (
        <ErrorState message={error?.message} onRetry={reload} />
      ) : status === 'loading' ? (
        <SkeletonRows rows={4} height={48} />
      ) : data && data.data.length === 0 ? (
        <EmptyState icon="people" message="No customers found." />
      ) : (
        <div className={styles.list}>
          {data?.data.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={styles.row}
              onClick={() => onSelect(customer)}
            >
              <Avatar name={customer.name} size={40} />
              <span className={styles.main}>
                <span className={styles.name}>{customer.name}</span>
                <span className={styles.meta}>
                  {customer.email ?? customer.company ?? '—'}
                </span>
              </span>
              <Icon name="arrowRight" size={18} className={styles.arrow} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
