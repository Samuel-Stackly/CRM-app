import { useState, type FormEvent } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { SelectField } from '../../../components/ui/SelectField'
import { TextField } from '../../../components/ui/TextField'
import { ApiError } from '../../../services/http'
import { DEAL_STAGES, type Customer, type Deal, type DealStage } from '../../../types/models'
import type { DealPayload } from '../api'
import { toDateInputValue } from '../format'
import { SelectCustomerModal } from './SelectCustomerModal'
import styles from './DealFormModal.module.css'

interface DealFormModalProps {
  /** Omitted when creating. */
  deal?: Deal
  /** Pre-selected customer, when creating from a customer's page. */
  initialCustomer?: Customer
  onSubmit: (payload: DealPayload) => Promise<void>
  onClose: () => void
}

const STAGE_OPTIONS = DEAL_STAGES.map((value) => ({ value, label: value }))

interface SelectedCustomer {
  id: string
  name: string
  company: string | null
}

/**
 * Create and edit form.
 *
 * The design's version collects room images, area, occupancy and access; the
 * assignment's deal is title, value, stage, expected close date and a linked
 * customer (docs/PRD.md C2), so the layout is reused with the real fields.
 */
export function DealFormModal({ deal, initialCustomer, onSubmit, onClose }: DealFormModalProps) {
  const isEdit = deal !== undefined

  const [title, setTitle] = useState(deal?.title ?? '')
  const [value, setValue] = useState(deal ? String(deal.value) : '')
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? 'Lead')
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    toDateInputValue(deal?.expectedCloseDate ?? null),
  )
  const [customer, setCustomer] = useState<SelectedCustomer | null>(
    deal?.customer ?? (initialCustomer
      ? { id: initialCustomer.id, name: initialCustomer.name, company: initialCustomer.company }
      : null),
  )

  const [picking, setPicking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!customer) {
      setFieldErrors({ customer: 'Choose a customer for this deal' })
      return
    }

    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit({
        title: title.trim(),
        // Sent as a number; an empty box becomes 0 rather than NaN.
        value: Number(value) || 0,
        stage,
        expectedCloseDate: expectedCloseDate || undefined,
        customer: customer.id,
      })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors)
        setError(caught.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
      setSubmitting(false)
    }
  }

  const formId = 'deal-form'

  return (
    <>
      <Modal
        title={isEdit ? 'Edit Deal' : 'Add New Deal'}
        onClose={onClose}
        footer={
          <>
            <div className={styles.stageFooter}>
              <span className={styles.stageLabel}>Stage</span>
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value as DealStage)}
                aria-label="Stage"
                style={{
                  height: 'var(--control-height)',
                  padding: '0 var(--space-4)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-rail)',
                }}
              >
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Done' : 'Save Deal'}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className={styles.form}
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          {error ? (
            <p className={styles.alert} role="alert">
              <Icon name="alert" size={18} />
              {error}
            </p>
          ) : null}

          <div className={styles.customerBand}>
            <Avatar name={customer?.name ?? '?'} size={40} />
            <div className={styles.customerMain}>
              <p className={styles.customerLabel}>Customer</p>
              <p className={styles.customerName}>{customer?.name ?? 'None selected'}</p>
            </div>
            <Button variant="secondary" onClick={() => setPicking(true)}>
              {customer ? 'Change Customer' : 'Select Customer'}
            </Button>
          </div>

          {fieldErrors['customer'] ? (
            <span style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }} role="alert">
              {fieldErrors['customer']}
            </span>
          ) : null}

          <div className={styles.grid}>
            <div className={styles.full}>
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                error={fieldErrors['title']}
                placeholder="Office fit-out"
                required
              />
            </div>

            <TextField
              label="Value ($)"
              type="number"
              min={0}
              step="1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              error={fieldErrors['value']}
              placeholder="6000"
              required
            />

            <TextField
              label="Expected Close Date"
              type="date"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
              error={fieldErrors['expectedCloseDate']}
            />

            <div className={styles.full}>
              <SelectField
                label="Stage"
                value={stage}
                options={STAGE_OPTIONS}
                onChange={(event) => setStage(event.target.value as DealStage)}
                error={fieldErrors['stage']}
              />
            </div>
          </div>
        </form>
      </Modal>

      {picking ? (
        <SelectCustomerModal
          onSelect={(selected) => {
            setCustomer({ id: selected.id, name: selected.name, company: selected.company })
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  )
}
