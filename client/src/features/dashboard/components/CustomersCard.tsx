import { Link } from 'react-router-dom'

import { Avatar } from '../../../components/ui/Avatar'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { Customer } from '../../../types/models'
import styles from './CustomersCard.module.css'

interface CustomersCardProps {
  customers: Customer[]
  loading: boolean
}

/**
 * Rendered directly on the rail rather than inside a white card, matching the
 * design (DESIGN_SPEC §4.1).
 */
export function CustomersCard({ customers, loading }: CustomersCardProps) {
  return (
    <section>
      <header className={styles.header}>
        <h2 className={styles.title}>Customers</h2>
        <Link className={styles.link} to="/customers">
          View All
        </Link>
      </header>

      {loading ? (
        <SkeletonRows rows={3} height={46} />
      ) : customers.length === 0 ? (
        <EmptyState icon="people" message="No customers found." layout="inline" />
      ) : (
        <div className={styles.list}>
          {customers.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className={styles.row}>
              <Avatar name={customer.name} />
              <div className={styles.main}>
                <p className={styles.name}>{customer.name}</p>
                <p className={styles.email}>{customer.email ?? customer.company ?? '—'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
