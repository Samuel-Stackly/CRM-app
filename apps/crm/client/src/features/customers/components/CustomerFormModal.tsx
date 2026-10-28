import { useState, type FormEvent } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { SelectField } from '../../../components/ui/SelectField'
import { TextArea } from '../../../components/ui/TextArea'
import { TextField } from '../../../components/ui/TextField'
import { ApiError } from '../../../services/http'
import { CUSTOMER_STATUSES, type Customer, type CustomerStatus } from '../../../types/models'
import type { CustomerPayload } from '../api'
import styles from './CustomerFormModal.module.css'

interface CustomerFormModalProps {
  /** Omitted when creating. */
  customer?: Customer
  onSubmit: (payload: CustomerPayload) => Promise<void>
  onClose: () => void
}

const STATUS_OPTIONS = CUSTOMER_STATUSES.map((value) => ({
  value,
  label: `${value[0]?.toUpperCase()}${value.slice(1)}`,
}))

/**
 * Create and edit form.
 *
 * The design's version collects first/last name and a postal address; the
 * assignment's customer is name, company, email, phone, status and notes
 * (docs/PRD.md C1), so the layout is reused with the real field set.
 */
export function CustomerFormModal({ customer, onSubmit, onClose }: CustomerFormModalProps) {
  const isEdit = customer !== undefined

  const [name, setName] = useState(customer?.name ?? '')
  const [company, setCompany] = useState(customer?.company ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? 'lead')
  const [notes, setNotes] = useState(customer?.notes ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status,
        notes: notes.trim(),
      })
    } catch (caught) {
      if (caught instanceof ApiError) {
        // Server-side Zod issues drive the inline messages.
        setFieldErrors(caught.fieldErrors)
        setError(caught.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
      setSubmitting(false)
    }
  }

  const formId = 'customer-form'

  return (
    <Modal
      title={isEdit ? 'Edit Customer' : 'Add New Customer'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Done' : 'Save Customer'}
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

        <div className={styles.grid}>
          <div className={styles.full}>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors['name']}
              placeholder="Deanna Annis"
              required
            />
          </div>

          <TextField
            label="Company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            error={fieldErrors['company']}
            placeholder="Northwind Ltd"
          />

          <SelectField
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(event) => setStatus(event.target.value as CustomerStatus)}
            error={fieldErrors['status']}
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors['email']}
            placeholder="deanna@example.com"
          />

          <TextField
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={fieldErrors['phone']}
            placeholder="999-999-9999"
          />

          <div className={styles.full}>
            <TextArea
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              error={fieldErrors['notes']}
              placeholder="Anything worth remembering about this customer."
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
