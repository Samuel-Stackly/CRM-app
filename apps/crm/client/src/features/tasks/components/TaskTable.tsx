import { Icon } from '../../../components/icons/Icon'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { Task } from '../../../types/models'
import { formatDate } from '../format'
import { PriorityChip } from './PriorityChip'
import { TaskStateIcon } from './TaskStateIcon'
import styles from './TaskTable.module.css'

interface TaskTableProps {
  tasks: Task[]
  loading: boolean
  togglingId: string | null
  onToggle: (task: Task, done: boolean) => void
  onEdit: (task: Task) => void
}

function links(task: Task): string {
  return [task.customer?.name, task.deal?.name].filter(Boolean).join(' · ')
}

export function TaskTable({ tasks, loading, togglingId, onToggle, onEdit }: TaskTableProps) {
  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.state}>
          <SkeletonRows rows={6} height={48} />
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.state}>
          <EmptyState icon="checklist" message="No tasks found." />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead className={styles.head}>
            <tr>
              <th scope="col" className={styles.checkCell}>
                <span className="srOnly">Complete</span>
              </th>
              <th scope="col">Due Date</th>
              <th scope="col">Task</th>
              <th scope="col">Priority</th>
              <th scope="col">Linked to</th>
              <th scope="col">
                <span className="srOnly">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={styles.row}>
                <td>
                  <TaskStateIcon
                    task={task}
                    busy={togglingId === task.id}
                    onToggle={(done) => onToggle(task, done)}
                  />
                </td>
                <td className={`${styles.date} ${task.overdue ? styles.overdue : ''}`}>
                  {formatDate(task.dueDate)}
                </td>
                <td className={`${styles.title} ${task.done ? styles.completed : ''}`}>
                  {task.title}
                </td>
                <td>
                  <PriorityChip priority={task.priority} />
                </td>
                <td className={styles.links}>{links(task) || '—'}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onEdit(task)}
                      aria-label={`Edit ${task.title}`}
                    >
                      <Icon name="pencil" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cards}>
        {tasks.map((task) => (
          <div key={task.id} className={styles.card}>
            <TaskStateIcon
              task={task}
              busy={togglingId === task.id}
              onToggle={(done) => onToggle(task, done)}
            />
            <button type="button" className={styles.cardButton} onClick={() => onEdit(task)}>
              <span className={`${styles.cardTitle} ${task.done ? styles.completed : ''}`}>
                {task.title}
              </span>
              <span className={`${styles.cardMeta} ${task.overdue ? styles.overdue : ''}`}>
                {formatDate(task.dueDate)}
              </span>
            </button>
            <PriorityChip priority={task.priority} />
          </div>
        ))}
      </div>
    </div>
  )
}
