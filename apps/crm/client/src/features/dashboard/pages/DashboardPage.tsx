import { ErrorState } from '../../../components/ui/ErrorState'
import { CustomersCard } from '../components/CustomersCard'
import { NextAppointmentCard } from '../components/NextAppointmentCard'
import { PipelineCard } from '../components/PipelineCard'
import { RecentDealsCard } from '../components/RecentDealsCard'
import { StatCard } from '../components/StatCard'
import { TasksCard } from '../components/TasksCard'
import { useDashboard } from '../useDashboard'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { status, data, error, reload } = useDashboard()

  // A failed load replaces the grid: partial cards would imply empty data.
  if (status === 'error') {
    return <ErrorState message={error?.message} onRetry={reload} />
  }

  const loading = status === 'loading'
  const metrics = data?.summary.metrics

  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <NextAppointmentCard deal={data?.nextAppointment} loading={loading} />

        <div className={styles.stats}>
          <StatCard
            label="Customers"
            value={metrics?.totalCustomers}
            icon="people"
            tone="mint"
            loading={loading}
          />
          <StatCard
            label="Deals"
            value={data?.totalDeals}
            icon="briefcase"
            tone="salmon"
            loading={loading}
          />
        </div>
      </div>

      <div className={styles.middle}>
        <RecentDealsCard deals={data?.recentDeals ?? []} loading={loading} />
        <PipelineCard
          stages={data?.summary.pipelineByStage ?? []}
          openPipelineValue={metrics?.openPipelineValue ?? 0}
          loading={loading}
        />
      </div>

      <aside className={styles.rail}>
        <CustomersCard customers={data?.recentCustomers ?? []} loading={loading} />
        <TasksCard
          tasks={data?.openTasks ?? []}
          tasksDueToday={metrics?.tasksDueToday ?? 0}
          overdueTasks={metrics?.overdueTasks ?? 0}
          loading={loading}
        />
      </aside>
    </div>
  )
}
