import { useCallback, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { useToast } from '../../../components/toast/useToast'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { useAsync } from '../../../hooks/useAsync'
import type { Task } from '../../../types/models'
import { tasksApi, type TaskPayload } from '../api'
import { TaskFormModal } from '../components/TaskFormModal'
import { TaskTable } from '../components/TaskTable'
import { TaskToolbar } from '../components/TaskToolbar'
import { useTaskFilters } from '../useTaskFilters'
import styles from './TasksPage.module.css'

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; task: Task }
  | { kind: 'delete'; task: Task }

export function TasksPage() {
  const { done, priority, overdue, search, sort, page, setFilters, setPage, reset, activeCount } =
    useTaskFilters()
  const { notify } = useToast()

  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' })
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      tasksApi.list({ done, priority, overdue, search, sort, page }, signal),
    [done, priority, overdue, search, sort, page],
  )

  const { data, status, error, reload } = useAsync(fetcher)

  const closeDialog = () => setDialog({ kind: 'none' })

  async function handleCreate(payload: TaskPayload) {
    await tasksApi.create(payload)
    closeDialog()
    notify('Task Saved')
    reload()
  }

  async function handleUpdate(id: string, payload: TaskPayload) {
    await tasksApi.update(id, payload)
    closeDialog()
    notify('Task Saved')
    reload()
  }

  async function handleDelete(task: Task) {
    setDeleting(true)
    try {
      await tasksApi.remove(task.id)
      closeDialog()
      notify('Task Deleted', 'deleted')
      reload()
    } catch {
      notify('Could not delete the task', 'deleted')
    } finally {
      setDeleting(false)
    }
  }

  /** Completing straight from the list, via the designed checkbox column. */
  async function handleToggle(task: Task, nextDone: boolean) {
    setTogglingId(task.id)
    try {
      await tasksApi.update(task.id, { done: nextDone })
      // Re-read so `overdue` and `completedAt` come from the server rather than
      // being guessed at on the client.
      reload()
    } catch {
      notify('Could not update the task', 'deleted')
    } finally {
      setTogglingId(null)
    }
  }

  if (status === 'error') {
    return <ErrorState message={error?.message} onRetry={reload} />
  }

  const loading = status === 'loading'

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          Add New Task
          <Icon name="plus" size={18} />
        </Button>
      </div>

      <TaskToolbar
        total={data?.pagination.total ?? 0}
        loading={loading}
        done={done}
        priority={priority}
        overdue={overdue}
        search={search}
        sort={sort}
        activeCount={activeCount}
        onFiltersChange={setFilters}
        onReset={reset}
      />

      <TaskTable
        tasks={data?.data ?? []}
        loading={loading}
        togglingId={togglingId}
        onToggle={(task, nextDone) => void handleToggle(task, nextDone)}
        onEdit={(task) => setDialog({ kind: 'edit', task })}
      />

      {data ? <Pagination pagination={data.pagination} onChange={setPage} /> : null}

      {dialog.kind === 'create' ? (
        <TaskFormModal onSubmit={handleCreate} onClose={closeDialog} />
      ) : null}

      {dialog.kind === 'edit' ? (
        <TaskFormModal
          task={dialog.task}
          onSubmit={(payload) => handleUpdate(dialog.task.id, payload)}
          onDelete={() => setDialog({ kind: 'delete', task: dialog.task })}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.kind === 'delete' ? (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${dialog.task.title}"? This cannot be undone.`}
          busy={deleting}
          onConfirm={() => void handleDelete(dialog.task)}
          onCancel={closeDialog}
        />
      ) : null}
    </div>
  )
}
