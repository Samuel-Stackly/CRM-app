import { Icon } from '../../../components/icons/Icon'
import type { Task } from '../../../types/models'
import styles from './TaskStateIcon.module.css'

interface TaskStateIconProps {
  task: Task
  busy?: boolean
  onToggle: (done: boolean) => void
}

/** A task completed after its due date — the design's salmon check. */
function wasCompletedLate(task: Task): boolean {
  if (!task.done || !task.completedAt) return false
  return Date.parse(task.completedAt) > Date.parse(task.dueDate)
}

function describe(task: Task): string {
  if (task.done) return wasCompletedLate(task) ? 'Completed late' : 'Completed'
  return task.overdue ? 'Overdue' : 'Not complete'
}

export function TaskStateIcon({ task, busy = false, onToggle }: TaskStateIconProps) {
  const late = wasCompletedLate(task)

  const variant = task.done
    ? late
      ? styles.doneLate
      : styles.done
    : task.overdue
      ? styles.overdue
      : styles.open

  return (
    <button
      type="button"
      className={`${styles.button} ${variant}`}
      disabled={busy}
      onClick={() => onToggle(!task.done)}
      aria-pressed={task.done}
      title={describe(task)}
    >
      {task.done ? (
        <Icon name="check" size={16} />
      ) : task.overdue ? (
        <Icon name="alert" size={20} />
      ) : null}
      <span className="srOnly">
        {describe(task)} — {task.done ? 'mark as not done' : 'mark as done'}
      </span>
    </button>
  )
}
