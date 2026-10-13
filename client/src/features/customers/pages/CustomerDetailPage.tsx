import { useCallback, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { useToast } from '../../../components/toast/useToast'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { SelectField } from '../../../components/ui/SelectField'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import { Spinner } from '../../../components/ui/Spinner'
import { StatusChip } from '../../../components/ui/StatusChip'
import { TextArea } from '../../../components/ui/TextArea'
import { TextField } from '../../../components/ui/TextField'
import { useAsync } from '../../../hooks/useAsync'
import { ApiError } from '../../../services/http'
import { CUSTOMER_STATUSES, type Customer, type CustomerStatus, type Deal } from '../../../types/models'
import { customersApi } from '../api'
import styles from './CustomerDetailPage.module.css'

const STATUS_OPTIONS = CUSTOMER_STATUSES.map((value) => ({
  value,
  label: `${value[0]?.toUpperCase()}${value.slice(1)}`,
}))

interface DetailData {
  customer: Customer
  deals: Deal[]
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function CustomerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<DetailData> => {
      const customer = await customersApi.get(id, signal)
      // Deals come from the deals endpoint; the customer response does not
      // nest them yet.
      const deals = await customersApi.deals(id, signal)
      return { customer: customer.customer, deals: deals.data }
    },
    [id],
  )

  const { data, status, error, reload } = useAsync(fetcher)

  const [form, setForm] = useState<Customer | null>(null)
  const [seededAt, setSeededAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Seed the editable copy from the loaded record, and reseed after a save so
  // the form reflects what the server actually stored. Derived during render
  // rather than in an effect, which would cost an extra commit.
  if (data?.customer && data.customer.updatedAt !== seededAt) {
    setSeededAt(data.customer.updatedAt)
    setForm(data.customer)
  }

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <ErrorState
        message={notFound ? 'That customer does not exist.' : error?.message}
        onRetry={notFound ? undefined : reload}
      />
    )
  }

  if (status === 'loading' || !form) {
    return <Spinner fullPage label="Loading customer" />
  }

  const update = <K extends keyof Customer>(key: K, value: Customer[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current))

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return

    setSaving(true)
    setFormError(null)
    setFieldErrors({})

    try {
      await customersApi.update(form.id, {
        name: form.name.trim(),
        company: form.company?.trim() ?? '',
        email: form.email?.trim() ?? '',
        phone: form.phone?.trim() ?? '',
        status: form.status,
        notes: form.notes?.trim() ?? '',
      })
      notify('Customer Saved')
      reload()
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors)
        setFormError(caught.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form) return

    setDeleting(true)
    try {
      await customersApi.remove(form.id)
      notify('Customer Deleted', 'deleted')
      await navigate('/customers', { replace: true })
    } catch {
      notify('Could not delete the customer', 'deleted')
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.banner}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(form.name)}
          </span>

          <div className={styles.bannerActions}>
            <button
              type="button"
              className={`${styles.circleButton} ${styles.danger}`}
              onClick={() => setConfirming(true)}
              aria-label="Delete customer"
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.identity}>
            <div>
              <h2 className={styles.name}>{form.name}</h2>
              {form.company ? <p className={styles.company}>{form.company}</p> : null}
            </div>
            <StatusChip status={form.status} />
          </div>

          {formError ? (
            <p className={styles.alert} role="alert">
              <Icon name="alert" size={18} />
              {formError}
            </p>
          ) : null}

          <form onSubmit={(event) => void handleSave(event)} noValidate>
            <div className={styles.grid2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                error={fieldErrors['name']}
                required
              />
              <TextField
                label="Company"
                value={form.company ?? ''}
                onChange={(event) => update('company', event.target.value)}
                error={fieldErrors['company']}
              />
              <TextField
                label="Email"
                type="email"
                value={form.email ?? ''}
                onChange={(event) => update('email', event.target.value)}
                error={fieldErrors['email']}
              />
              <TextField
                label="Phone"
                value={form.phone ?? ''}
                onChange={(event) => update('phone', event.target.value)}
                error={fieldErrors['phone']}
              />
              <SelectField
                label="Status"
                value={form.status}
                options={STATUS_OPTIONS}
                onChange={(event) => update('status', event.target.value as CustomerStatus)}
                error={fieldErrors['status']}
              />
              <div className={styles.full}>
                <TextArea
                  label="Notes"
                  value={form.notes ?? ''}
                  onChange={(event) => update('notes', event.target.value)}
                  error={fieldErrors['notes']}
                />
              </div>
            </div>

            {/* The design's detail screen has no submit control; an explicit
                Save is added so the update is deliberate. */}
            <div className={styles.footer}>
              <Button variant="ghost" onClick={() => void navigate('/customers')}>
                Back
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Customer'}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <aside className={styles.rail}>
        <div className={styles.railHeader}>
          <h2 className={styles.railTitle}>Recent Deals</h2>
        </div>

        {!data ? (
          <SkeletonRows rows={3} height={44} />
        ) : data.deals.length === 0 ? (
          <EmptyState icon="briefcase" message="No deals found." layout="inline" />
        ) : (
          data?.deals.map((deal) => (
            <article key={deal.id} className={styles.dealRow}>
              <div className={styles.dealMain}>
                <p className={styles.dealTitle}>{deal.title}</p>
                <p className={styles.dealMeta}>
                  {deal.stage} · {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  }).format(deal.value)}
                </p>
              </div>
            </article>
          ))
        )}
      </aside>

      {confirming ? (
        <ConfirmDialog
          title="Delete customer"
          message={`Delete ${form.name}? This cannot be undone.`}
          busy={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  )
}
