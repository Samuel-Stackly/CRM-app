import { Link } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { Card, CardHeader } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { Task } from '../../../types/models'
import { formatDate } from '../format'
import styles from './TasksCard.module.css'

interface TasksCardProps {
  tasks: Task[]
  tasksDueToday: number
  overdueTasks: number
  loading: boolean
}

export function TasksCard({ tasks, tasksDueToday, overdueTasks, loading }: TasksCardProps) {
  return (
    <Card>
      <CardHeader title="Tasks To Do" action={<Link to="/tasks">View All</Link>} />

      {loading ? (
        <SkeletonRows rows={5} height={30} />
      ) : tasks.length === 0 ? (
        <div className={styles.emptyTopLeft}>
          <EmptyState icon="checklist" message="No upcoming tasks found." layout="inline" />
        </div>
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => (
            <article key={task.id} className={styles.row}>
              {/* `overdue` is computed by the server on every read. */}
              <span className={`${styles.date} ${task.overdue ? styles.overdue : ''}`}>
                {formatDate(task.dueDate)}
              </span>
              <span className={styles.alert}>
                {task.overdue ? <Icon name="alert" size={16} /> : null}
              </span>
              <span className={styles.title}>{task.title}</span>
            </article>
          ))}
        </div>
      )}

      {!loading ? (
        <div className={styles.summary}>
          <span>
            Due today <span className={styles.count}>{tasksDueToday}</span>
          </span>
          <span>
            Overdue <span className={styles.countDanger}>{overdueTasks}</span>
          </span>
        </div>
      ) : null}
    </Card>
  )
}
