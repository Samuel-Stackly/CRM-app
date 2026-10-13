import { useCallback, useState, type FormEvent } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { SelectField } from '../../../components/ui/SelectField'
import { TextArea } from '../../../components/ui/TextArea'
import { TextField } from '../../../components/ui/TextField'
import { useAsync } from '../../../hooks/useAsync'
import { ApiError } from '../../../services/http'
import { TASK_PRIORITIES, type Task, type TaskPriority } from '../../../types/models'
import { tasksApi, type TaskPayload } from '../api'
import { toDateTimeInputValue } from '../format'
import styles from './TaskFormModal.module.css'

interface TaskFormModalProps {
  /** Omitted when creating. */
  task?: Task
  onSubmit: (payload: TaskPayload) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((value) => ({
  value,
  label: `${value[0]?.toUpperCase()}${value.slice(1)}`,
}))

export function TaskFormModal({ task, onSubmit, onDelete, onClose }: TaskFormModalProps) {
  const isEdit = task !== undefined

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(toDateTimeInputValue(task?.dueDate ?? null))
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [done, setDone] = useState(task?.done ?? false)
  const [customer, setCustomer] = useState(task?.customer?.id ?? '')
  const [deal, setDeal] = useState(task?.deal?.id ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Real options for the link selectors.
  const loadOptions = useCallback(async (signal: AbortSignal) => {
    const [customers, deals] = await Promise.all([
      tasksApi.customers(signal),
      tasksApi.deals(signal),
    ])
    return { customers: customers.data, deals: deals.data }
  }, [])

  const { data: options, status: optionsStatus } = useAsync(loadOptions)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        // datetime-local is local time; the API stores an ISO instant.
        dueDate: dueDate ? new Date(dueDate).toISOString() : '',
        priority,
        done,
        // null clears an existing link; the API rejects unknown keys, so only
        // the two reference fields are ever sent.
        customer: customer || null,
        deal: deal || null,
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

  const formId = 'task-form'
  const optionsLoading = optionsStatus === 'loading'

  return (
    <Modal
      title={isEdit ? 'Edit Task' : 'Add New Task'}
      size="md"
      onClose={onClose}
      footer={
        <>
          {isEdit && onDelete ? (
            <div className={styles.deleteSlot}>
              <Button variant="danger" onClick={onDelete} disabled={submitting}>
                Delete
              </Button>
            </div>
          ) : null}

          {!isEdit ? (
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          ) : null}

          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Done' : 'Save Task'}
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

        {isEdit ? (
          <div className={styles.completeRow}>
            <span className={styles.completeLabel}>Complete?</span>
            <button
              type="button"
              className={`${styles.checkbox} ${done ? styles.checked : ''}`}
              onClick={() => setDone((current) => !current)}
              aria-pressed={done}
              aria-label="Mark task complete"
            >
              {done ? <Icon name="check" size={15} /> : null}
            </button>
          </div>
        ) : null}

        <TextField
          label="Task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={fieldErrors['title']}
          placeholder="Send revised quote"
          required
        />

        <div className={styles.grid}>
          <TextField
            label="Due Date"
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            error={fieldErrors['dueDate']}
            required
          />

          <SelectField
            label="Priority"
            value={priority}
            options={PRIORITY_OPTIONS}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            error={fieldErrors['priority']}
          />

          <SelectField
            label="Customer"
            value={customer}
            disabled={optionsLoading}
            options={[
              { value: '', label: optionsLoading ? 'Loading…' : 'No customer' },
              ...(options?.customers ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
            onChange={(event) => setCustomer(event.target.value)}
            error={fieldErrors['customer']}
          />

          <SelectField
            label="Deal"
            value={deal}
            disabled={optionsLoading}
            options={[
              { value: '', label: optionsLoading ? 'Loading…' : 'No deal' },
              ...(options?.deals ?? []).map((item) => ({
                value: item.id,
                label: item.title,
              })),
            ]}
            onChange={(event) => setDeal(event.target.value)}
            error={fieldErrors['deal']}
          />

          <div className={styles.full}>
            <TextArea
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              error={fieldErrors['description']}
              placeholder="Enter task description"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
