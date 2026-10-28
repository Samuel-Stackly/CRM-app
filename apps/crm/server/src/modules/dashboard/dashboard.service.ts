import { Customer } from '../../models/Customer.js'
import { DEAL_STAGES, Deal, OPEN_DEAL_STAGES, type DealStage } from '../../models/Deal.js'
import { Task } from '../../models/Task.js'
import {
  startOfDay,
  startOfMonth,
  startOfNextDay,
  startOfNextMonth,
} from '../../utils/dates.js'
import { toObjectId } from '../../utils/objectId.js'

export interface DashboardMetrics {
  totalCustomers: number
  openPipelineValue: number
  dealsWonThisMonth: number
  tasksDueToday: number
  overdueTasks: number
}

export interface PipelineStageSummary {
  stage: DealStage
  count: number
  totalValue: number
}

export interface DashboardResponse {
  metrics: DashboardMetrics
  pipelineByStage: PipelineStageSummary[]
  generatedAt: string
}

/** `$count` yields an empty array when nothing matches, rather than a zero. */
function readCount(result: { count?: number }[]): number {
  return result[0]?.count ?? 0
}

function readSum(result: { total?: number }[]): number {
  return result[0]?.total ?? 0
}

/**
 * Builds every dashboard figure from MongoDB aggregation.
 *
 * Three round trips — one per collection — rather than one per metric: the deal
 * and task pipelines each use `$facet` to compute several figures in a single
 * pass over the same matched set. Nothing is counted or summed in JavaScript.
 *
 * Every pipeline opens with `$match` on the owner, so another user's documents
 * never enter the pipeline at all.
 */
export async function getDashboard(ownerId: string): Promise<DashboardResponse> {
  const now = new Date()
  const owner = toObjectId(ownerId)

  const todayStart = startOfDay(now)
  const tomorrowStart = startOfNextDay(now)
  const monthStart = startOfMonth(now)
  const nextMonthStart = startOfNextMonth(now)

  const [customerResult, dealResult, taskResult] = await Promise.all([
    Customer.aggregate<{ totalCustomers: { count: number }[] }>([
      { $match: { owner } },
      { $facet: { totalCustomers: [{ $count: 'count' }] } },
    ]),

    Deal.aggregate<{
      openPipelineValue: { total: number }[]
      dealsWonThisMonth: { count: number }[]
      pipelineByStage: { _id: DealStage; count: number; totalValue: number }[]
    }>([
      { $match: { owner } },
      {
        $facet: {
          // "Open" excludes Won and Lost: Won is realised revenue, Lost is
          // neither. See docs/API.md Q11.
          openPipelineValue: [
            { $match: { stage: { $in: [...OPEN_DEAL_STAGES] } } },
            { $group: { _id: null, total: { $sum: '$value' } } },
          ],
          // Dated by wonAt, which is set when the deal enters the Won stage.
          // updatedAt would be re-dated by any later edit.
          dealsWonThisMonth: [
            {
              $match: {
                stage: 'Won',
                wonAt: { $gte: monthStart, $lt: nextMonthStart },
              },
            },
            { $count: 'count' },
          ],
          pipelineByStage: [
            {
              $group: {
                _id: '$stage',
                count: { $sum: 1 },
                totalValue: { $sum: '$value' },
              },
            },
          ],
        },
      },
    ]),

    Task.aggregate<{
      tasksDueToday: { count: number }[]
      overdueTasks: { count: number }[]
    }>([
      // Both figures concern outstanding work, so the shared match runs once.
      { $match: { owner, done: false } },
      {
        $facet: {
          tasksDueToday: [
            { $match: { dueDate: { $gte: todayStart, $lt: tomorrowStart } } },
            { $count: 'count' },
          ],
          // Mirrors the model's overdue rule: not done and past due.
          overdueTasks: [{ $match: { dueDate: { $lt: now } } }, { $count: 'count' }],
        },
      },
    ]),
  ])

  const customers = customerResult[0]
  const deals = dealResult[0]
  const tasks = taskResult[0]

  const stageTotals = new Map(
    (deals?.pipelineByStage ?? []).map((entry) => [entry._id, entry]),
  )

  return {
    metrics: {
      totalCustomers: readCount(customers?.totalCustomers ?? []),
      openPipelineValue: readSum(deals?.openPipelineValue ?? []),
      dealsWonThisMonth: readCount(deals?.dealsWonThisMonth ?? []),
      tasksDueToday: readCount(tasks?.tasksDueToday ?? []),
      overdueTasks: readCount(tasks?.overdueTasks ?? []),
    },
    // Every stage is present, zero-filled, so the chart never drops a column.
    pipelineByStage: DEAL_STAGES.map((stage) => ({
      stage,
      count: stageTotals.get(stage)?.count ?? 0,
      totalValue: stageTotals.get(stage)?.totalValue ?? 0,
    })),
    generatedAt: now.toISOString(),
  }
}
