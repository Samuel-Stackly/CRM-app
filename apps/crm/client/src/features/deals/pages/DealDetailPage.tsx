import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { useToast } from '../../../components/toast/useToast'
import { Avatar } from '../../../components/ui/Avatar'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { useAsync } from '../../../hooks/useAsync'
import { ApiError } from '../../../services/http'
import { DEAL_STAGES, type Deal, type DealStage, type Task } from '../../../types/models'
import { dealsApi, type DealPayload } from '../api'
import { DealFormModal } from '../components/DealFormModal'
import { StageChip } from '../components/StageChip'
import { formatCurrency, formatDate } from '../format'
import styles from './DealDetailPage.module.css'

interface DetailData {
  deal: Deal
  tasks: Task[]
}

export function DealDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingStage, setSavingStage] = useState(false)

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<DetailData> => {
      const deal = await dealsApi.get(id, signal)
      const tasks = await dealsApi.tasks(id, signal)
      return { deal, tasks: tasks.data }
    },
    [id],
  )

  const { data, status, error, reload } = useAsync(fetcher)

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <ErrorState
        message={notFound ? 'That deal does not exist.' : error?.message}
        onRetry={notFound ? undefined : reload}
      />
    )
  }

  if (status === 'loading' || !data) {
    return <Spinner fullPage label="Loading deal" />
  }

  const { deal, tasks } = data

  async function handleStageChange(stage: DealStage) {
    setSavingStage(true)
    try {
      await dealsApi.update(deal.id, { stage })
      notify('Deal Saved')
      reload()
    } catch {
      notify('Could not update the stage', 'deleted')
    } finally {
      setSavingStage(false)
    }
  }

  async function handleUpdate(payload: DealPayload) {
    await dealsApi.update(deal.id, payload)
    setEditing(false)
    notify('Deal Saved')
    reload()
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await dealsApi.remove(deal.id)
      notify('Deal Deleted', 'deleted')
      await navigate('/deals', { replace: true })
    } catch {
      notify('Could not delete the deal', 'deleted')
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.customerStrip}>
          <div className={styles.customerIdentity}>
            <Avatar name={deal.customer?.name ?? '?'} size={40} />
            <div>
              <p className={styles.fieldLabel}>Customer</p>
              <p className={styles.fieldValue}>{deal.customer?.name ?? '—'}</p>
            </div>
          </div>
          <div>
            <p className={styles.fieldLabel}>Company</p>
            <p className={styles.fieldValue}>{deal.customer?.company ?? '—'}</p>
          </div>
        </div>

        <div className={styles.titleRow}>
          <h2 className={styles.title}>{deal.title}</h2>
          <div className={styles.titleActions}>
            <button
              type="button"
              className={`${styles.circleButton} ${styles.danger}`}
              onClick={() => setConfirming(true)}
              aria-label="Delete deal"
            >
              <Icon name="trash" />
            </button>
            <button
              type="button"
              className={styles.circleButton}
              onClick={() => setEditing(true)}
              aria-label="Edit deal"
            >
              <Icon name="pencil" />
            </button>
          </div>
        </div>

        <div className={styles.attributes}>
          <div>
            <p className={styles.fieldLabel}>Stage</p>
            <StageChip stage={deal.stage} />
          </div>
          <div>
            <p className={styles.fieldLabel}>Expected Close Date</p>
            <p className={styles.fieldValue}>{formatDate(deal.expectedCloseDate)}</p>
          </div>
          <div>
            <p className={styles.fieldLabel}>Value</p>
            <p className={styles.fieldValue}>{formatCurrency(deal.value)}</p>
          </div>
          <div>
            <p className={styles.fieldLabel}>Created</p>
            <p className={styles.fieldValue}>{formatDate(deal.createdAt)}</p>
          </div>
        </div>

        <div className={styles.stageRow}>
          <label className={styles.fieldLabel} htmlFor="stage-select">
            Move to stage
          </label>
          <select
            id="stage-select"
            className={styles.stageSelect}
            value={deal.stage}
            disabled={savingStage}
            onChange={(event) => void handleStageChange(event.target.value as DealStage)}
          >
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
      </section>

      <aside className={styles.rail}>
        <h2 className={styles.railTitle}>Related Tasks</h2>
        {/* The design shows a Record Activity form and an Activity Log here.
            The assignment defines no activity entity and the API exposes none,
            so the rail shows this deal's tasks instead. */}
        <p className={styles.note}>
          Activity logging is not part of this build — see the note in the README.
        </p>

        {tasks.length === 0 ? (
          <EmptyState icon="checklist" message="No tasks found." layout="inline" />
        ) : (
          tasks.map((task) => (
            <article key={task.id} className={styles.taskRow}>
              <div className={styles.taskMain}>
                <p className={styles.taskTitle}>{task.title}</p>
                <p className={`${styles.taskMeta} ${task.overdue ? styles.overdue : ''}`}>
                  {formatDate(task.dueDate)}
                  {task.overdue ? ' · Overdue' : ''}
                </p>
              </div>
            </article>
          ))
        )}
      </aside>

      {editing ? (
        <DealFormModal deal={deal} onSubmit={handleUpdate} onClose={() => setEditing(false)} />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Delete deal"
          message={`Delete ${deal.title}? This cannot be undone.`}
          busy={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  )
}
