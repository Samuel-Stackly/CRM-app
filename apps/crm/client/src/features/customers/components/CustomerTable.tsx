import { useNavigate } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { Avatar } from '../../../components/ui/Avatar'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import { StatusChip } from '../../../components/ui/StatusChip'
import type { Customer } from '../../../types/models'
import styles from './CustomerTable.module.css'

interface CustomerTableProps {
  customers: Customer[]
  loading: boolean
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomerTable({ customers, loading, onEdit, onDelete }: CustomerTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.state}>
          <SkeletonRows rows={6} height={56} />
        </div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.state}>
          <EmptyState icon="people" message="No customers found." />
        </div>
      </div>
    )
  }

  const open = (id: string) => void navigate(`/customers/${id}`)

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead className={styles.head}>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="srOnly">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className={styles.row} onClick={() => open(customer.id)}>
                <td>
                  <div className={styles.identity}>
                    <Avatar name={customer.name} />
                    <div>
                      <p className={styles.name}>{customer.name}</p>
                      {customer.company ? (
                        <p className={styles.company}>{customer.company}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className={styles.truncate}>{customer.email ?? '—'}</td>
                <td>{customer.phone ?? '—'}</td>
                <td>
                  <StatusChip status={customer.status} />
                </td>
                <td>
                  {/* Row actions must not also trigger the row's navigation. */}
                  <div
                    className={styles.actions}
                    onClick={(event) => event.stopPropagation()}
                    role="presentation"
                  >
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onEdit(customer)}
                      aria-label={`Edit ${customer.name}`}
                    >
                      <Icon name="pencil" size={18} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.danger}`}
                      onClick={() => onDelete(customer)}
                      aria-label={`Delete ${customer.name}`}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cards}>
        {customers.map((customer) => (
          <button
            key={customer.id}
            type="button"
            className={styles.card}
            onClick={() => open(customer.id)}
          >
            <Avatar name={customer.name} size={40} />
            <span className={styles.cardMain}>
              <span className={styles.name}>{customer.name}</span>
              <span className={styles.cardMeta}>{customer.email ?? customer.phone ?? '—'}</span>
            </span>
            <StatusChip status={customer.status} />
          </button>
        ))}
      </div>
    </div>
  )
}
