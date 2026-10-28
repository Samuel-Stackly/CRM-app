import { useCallback, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { useUrlFilters } from '../../../hooks/useUrlFilters'
import type { Customer } from '../../../types/models'
import { customersApi, type CustomerPayload } from '../api'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { CustomerTable } from '../components/CustomerTable'
import { CustomerToolbar } from '../components/CustomerToolbar'
import styles from './CustomersPage.module.css'

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; customer: Customer }
  | { kind: 'delete'; customer: Customer }

export function CustomersPage() {
  const { search, status, sort, page, setFilters, setPage, reset, activeCount } =
    useUrlFilters('-createdAt')
  const { notify } = useToast()

  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' })
  const [deleting, setDeleting] = useState(false)

  // The URL is the query: every filter change produces a new request.
  const fetcher = useCallback(
    (signal: AbortSignal) => customersApi.list({ search, status, sort, page }, signal),
    [search, status, sort, page],
  )

  const { data, status: loadStatus, error, reload } = useAsync(fetcher)

  const closeDialog = () => setDialog({ kind: 'none' })

  async function handleCreate(payload: CustomerPayload) {
    await customersApi.create(payload)
    closeDialog()
    notify('Customer Saved')
    reload()
  }

  async function handleUpdate(id: string, payload: CustomerPayload) {
    await customersApi.update(id, payload)
    closeDialog()
    notify('Customer Saved')
    reload()
  }

  async function handleDelete(customer: Customer) {
    setDeleting(true)
    try {
      await customersApi.remove(customer.id)
      closeDialog()
      notify('Customer Deleted', 'deleted')
      reload()
    } catch {
      notify('Could not delete the customer', 'deleted')
    } finally {
      setDeleting(false)
    }
  }

  if (loadStatus === 'error') {
    return <ErrorState message={error?.message} onRetry={reload} />
  }

  const loading = loadStatus === 'loading'

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          Add New Customer
          <Icon name="plus" size={18} />
        </Button>
      </div>

      <CustomerToolbar
        total={data?.pagination.total ?? 0}
        loading={loading}
        search={search}
        status={status}
        sort={sort}
        activeCount={activeCount}
        onFiltersChange={setFilters}
        onReset={reset}
      />

      <CustomerTable
        customers={data?.data ?? []}
        loading={loading}
        onEdit={(customer) => setDialog({ kind: 'edit', customer })}
        onDelete={(customer) => setDialog({ kind: 'delete', customer })}
      />

      {data ? <Pagination pagination={data.pagination} onChange={setPage} /> : null}

      {dialog.kind === 'create' ? (
        <CustomerFormModal onSubmit={handleCreate} onClose={closeDialog} />
      ) : null}

      {dialog.kind === 'edit' ? (
        <CustomerFormModal
          customer={dialog.customer}
          onSubmit={(payload) => handleUpdate(dialog.customer.id, payload)}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.kind === 'delete' ? (
        <ConfirmDialog
          title="Delete customer"
          message={`Delete ${dialog.customer.name}? This cannot be undone.`}
          busy={deleting}
          onConfirm={() => void handleDelete(dialog.customer)}
          onCancel={closeDialog}
        />
      ) : null}
    </div>
  )
}
