import mongoose from 'mongoose'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import {
  createCustomer,
  createDeal,
  createTask,
  createTwoUsers,
  createUser,
  daysFromNow,
  type TestUser,
} from '../../__tests__/helpers.js'

/** Moves a deal into a stage through the API, so wonAt is set the normal way. */
async function setStage(user: TestUser, dealId: string, stage: string): Promise<void> {
  await request(app)
    .patch(`/api/deals/${dealId}`)
    .set('Cookie', user.cookie)
    .send({ stage })
    .expect(200)
}

async function getDashboard(user: TestUser): Promise<Record<string, any>> {
  const response = await request(app).get('/api/dashboard').set('Cookie', user.cookie)
  expect(response.status).toBe(200)
  return response.body as Record<string, any>
}

describe('Dashboard — authentication', () => {
  it('requires a session', async () => {
    await request(app).get('/api/dashboard').expect(401)
  })
})

describe('Empty dataset', () => {
  it('returns zeros and a fully populated stage list, not nulls or empty objects', async () => {
    const user = await createUser()

    const body = await getDashboard(user)

    expect(body.metrics).toEqual({
      totalCustomers: 0,
      openPipelineValue: 0,
      dealsWonThisMonth: 0,
      tasksDueToday: 0,
      overdueTasks: 0,
    })

    // All five stages present and zeroed, so a chart never drops a column.
    expect(body.pipelineByStage).toEqual([
      { stage: 'Lead', count: 0, totalValue: 0 },
      { stage: 'Qualified', count: 0, totalValue: 0 },
      { stage: 'Proposal', count: 0, totalValue: 0 },
      { stage: 'Won', count: 0, totalValue: 0 },
      { stage: 'Lost', count: 0, totalValue: 0 },
    ])

    expect(typeof body.generatedAt).toBe('string')
  })
})

describe('totalCustomers', () => {
  it('counts the user\'s customers', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'One' })
    await createCustomer(user, { name: 'Two' })
    await createCustomer(user, { name: 'Three' })

    const body = await getDashboard(user)
    expect(body.metrics.totalCustomers).toBe(3)
  })
})

describe('openPipelineValue', () => {
  it('sums Lead, Qualified and Proposal, excluding Won and Lost', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const id = customer['id'] as string

    await createDeal(user, id, { stage: 'Lead', value: 100 })
    await createDeal(user, id, { stage: 'Qualified', value: 200 })
    await createDeal(user, id, { stage: 'Proposal', value: 300 })
    await createDeal(user, id, { stage: 'Won', value: 5000 })
    await createDeal(user, id, { stage: 'Lost', value: 9000 })

    const body = await getDashboard(user)
    // 100 + 200 + 300; the Won and Lost values must not appear.
    expect(body.metrics.openPipelineValue).toBe(600)
  })

  it('drops a deal out of the open total when it is won', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const deal = await createDeal(user, customer['id'] as string, {
      stage: 'Proposal',
      value: 400,
    })

    expect((await getDashboard(user)).metrics.openPipelineValue).toBe(400)

    await setStage(user, deal['id'] as string, 'Won')

    expect((await getDashboard(user)).metrics.openPipelineValue).toBe(0)
  })
})

describe('dealsWonThisMonth', () => {
  it('counts deals won in the current month', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const id = customer['id'] as string

    const first = await createDeal(user, id, { stage: 'Lead', value: 10 })
    const second = await createDeal(user, id, { stage: 'Lead', value: 20 })
    await createDeal(user, id, { stage: 'Lead', value: 30 })

    await setStage(user, first['id'] as string, 'Won')
    await setStage(user, second['id'] as string, 'Won')

    const body = await getDashboard(user)
    expect(body.metrics.dealsWonThisMonth).toBe(2)
  })

  it('excludes a deal won in a previous month', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const deal = await createDeal(user, customer['id'] as string, { stage: 'Won', value: 50 })

    // Backdate the win directly, which the API will not allow.
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 2)
    await mongoose.connection
      .collection('deals')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(deal['id'] as string) },
        { $set: { wonAt: lastMonth } },
      )

    const body = await getDashboard(user)
    expect(body.metrics.dealsWonThisMonth).toBe(0)
    // Still counted in the stage breakdown, which is not time-scoped.
    const won = body.pipelineByStage.find((s: { stage: string }) => s.stage === 'Won')
    expect(won.count).toBe(1)
  })

  it('stops counting a deal moved back out of Won', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const deal = await createDeal(user, customer['id'] as string, { stage: 'Lead', value: 10 })
    const id = deal['id'] as string

    await setStage(user, id, 'Won')
    expect((await getDashboard(user)).metrics.dealsWonThisMonth).toBe(1)

    await setStage(user, id, 'Proposal')
    expect((await getDashboard(user)).metrics.dealsWonThisMonth).toBe(0)
  })

  it('is not re-dated by an unrelated edit', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const deal = await createDeal(user, customer['id'] as string, { stage: 'Won', value: 10 })

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 2)
    await mongoose.connection
      .collection('deals')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(deal['id'] as string) },
        { $set: { wonAt: lastMonth } },
      )

    // Touching the title bumps updatedAt but must not resurrect the win.
    await request(app)
      .patch(`/api/deals/${deal['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({ title: 'Renamed' })
      .expect(200)

    expect((await getDashboard(user)).metrics.dealsWonThisMonth).toBe(0)
  })
})

describe('tasksDueToday and overdueTasks', () => {
  it('counts tasks due today, excluding completed ones', async () => {
    const user = await createUser()

    const noon = new Date()
    noon.setHours(12, 0, 0, 0)

    await createTask(user, { title: 'Today A', dueDate: noon.toISOString() })
    await createTask(user, { title: 'Today B', dueDate: noon.toISOString() })
    await createTask(user, { title: 'Today done', dueDate: noon.toISOString(), done: true })
    await createTask(user, { title: 'Tomorrow', dueDate: daysFromNow(1) })

    const body = await getDashboard(user)
    expect(body.metrics.tasksDueToday).toBe(2)
  })

  it('counts overdue tasks and never counts completed ones', async () => {
    const user = await createUser()

    await createTask(user, { title: 'Late A', dueDate: daysFromNow(-1) })
    await createTask(user, { title: 'Late B', dueDate: daysFromNow(-10) })
    await createTask(user, { title: 'Late but done', dueDate: daysFromNow(-5), done: true })
    await createTask(user, { title: 'Upcoming', dueDate: daysFromNow(3) })

    const body = await getDashboard(user)
    expect(body.metrics.overdueTasks).toBe(2)
  })

  it('drops a task from the overdue count once completed', async () => {
    const user = await createUser()
    const task = await createTask(user, { dueDate: daysFromNow(-2) })

    expect((await getDashboard(user)).metrics.overdueTasks).toBe(1)

    await request(app)
      .patch(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({ done: true })
      .expect(200)

    expect((await getDashboard(user)).metrics.overdueTasks).toBe(0)
  })
})

describe('pipelineByStage', () => {
  it('reports count and value per stage, zero-filling empty stages', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const id = customer['id'] as string

    await createDeal(user, id, { stage: 'Lead', value: 100 })
    await createDeal(user, id, { stage: 'Lead', value: 250 })
    await createDeal(user, id, { stage: 'Won', value: 1000 })

    const body = await getDashboard(user)
    const byStage = Object.fromEntries(
      body.pipelineByStage.map((s: { stage: string }) => [s.stage, s]),
    )

    expect(byStage['Lead']).toEqual({ stage: 'Lead', count: 2, totalValue: 350 })
    expect(byStage['Won']).toEqual({ stage: 'Won', count: 1, totalValue: 1000 })
    expect(byStage['Qualified']).toEqual({ stage: 'Qualified', count: 0, totalValue: 0 })
    expect(byStage['Proposal']).toEqual({ stage: 'Proposal', count: 0, totalValue: 0 })
    expect(byStage['Lost']).toEqual({ stage: 'Lost', count: 0, totalValue: 0 })
  })

  it('always returns the five stages in board order', async () => {
    const user = await createUser()
    const body = await getDashboard(user)

    expect(body.pipelineByStage.map((s: { stage: string }) => s.stage)).toEqual([
      'Lead',
      'Qualified',
      'Proposal',
      'Won',
      'Lost',
    ])
  })
})

describe('Consistency with the list endpoints', () => {
  it('agrees with the deals board totals for the same user', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const id = customer['id'] as string

    await createDeal(user, id, { stage: 'Lead', value: 100 })
    await createDeal(user, id, { stage: 'Proposal', value: 300 })

    const dashboard = await getDashboard(user)
    const board = await request(app)
      .get('/api/deals?groupBy=stage')
      .set('Cookie', user.cookie)

    const dashboardLead = dashboard.pipelineByStage.find(
      (s: { stage: string }) => s.stage === 'Lead',
    )
    const boardLead = board.body.stages.find((s: { stage: string }) => s.stage === 'Lead')

    expect(dashboardLead.count).toBe(boardLead.count)
    expect(dashboardLead.totalValue).toBe(boardLead.totalValue)
  })

  it('agrees with the customers list total', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'A' })
    await createCustomer(user, { name: 'B' })

    const dashboard = await getDashboard(user)
    const list = await request(app).get('/api/customers').set('Cookie', user.cookie)

    expect(dashboard.metrics.totalCustomers).toBe(list.body.pagination.total)
  })

  it('agrees with the overdue task filter', async () => {
    const user = await createUser()
    await createTask(user, { dueDate: daysFromNow(-1) })
    await createTask(user, { dueDate: daysFromNow(-2) })
    await createTask(user, { dueDate: daysFromNow(5) })

    const dashboard = await getDashboard(user)
    const overdue = await request(app)
      .get('/api/tasks?overdue=true')
      .set('Cookie', user.cookie)

    expect(dashboard.metrics.overdueTasks).toBe(overdue.body.pagination.total)
  })
})

describe('User isolation', () => {
  it('never includes another user\'s data in any metric', async () => {
    const [userA, userB] = await createTwoUsers()

    // Populate user A heavily.
    const customerA = await createCustomer(userA, { name: 'A Contact' })
    const idA = customerA['id'] as string
    await createCustomer(userA, { name: 'A Second' })
    await createDeal(userA, idA, { stage: 'Lead', value: 10_000 })
    const wonA = await createDeal(userA, idA, { stage: 'Lead', value: 7000 })
    await setStage(userA, wonA['id'] as string, 'Won')
    await createTask(userA, { dueDate: daysFromNow(-1) })

    // User B has nothing.
    const bodyB = await getDashboard(userB)

    expect(bodyB.metrics).toEqual({
      totalCustomers: 0,
      openPipelineValue: 0,
      dealsWonThisMonth: 0,
      tasksDueToday: 0,
      overdueTasks: 0,
    })
    expect(bodyB.pipelineByStage.every((s: { count: number }) => s.count === 0)).toBe(true)
  })

  it('reports each user\'s own figures independently', async () => {
    const [userA, userB] = await createTwoUsers()

    const customerA = await createCustomer(userA)
    await createDeal(userA, customerA['id'] as string, { stage: 'Lead', value: 500 })

    const customerB = await createCustomer(userB)
    await createDeal(userB, customerB['id'] as string, { stage: 'Lead', value: 70 })
    await createDeal(userB, customerB['id'] as string, { stage: 'Lead', value: 30 })

    const bodyA = await getDashboard(userA)
    const bodyB = await getDashboard(userB)

    expect(bodyA.metrics.openPipelineValue).toBe(500)
    expect(bodyB.metrics.openPipelineValue).toBe(100)

    const leadA = bodyA.pipelineByStage.find((s: { stage: string }) => s.stage === 'Lead')
    const leadB = bodyB.pipelineByStage.find((s: { stage: string }) => s.stage === 'Lead')
    expect(leadA.count).toBe(1)
    expect(leadB.count).toBe(2)
  })
})

describe('Query efficiency', () => {
  it('issues one round trip per collection, regardless of data volume', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const id = customer['id'] as string

    // Enough records that an N+1 implementation would be obvious.
    for (let i = 0; i < 10; i += 1) {
      await createDeal(user, id, { stage: 'Lead', value: 10 })
      await createTask(user, { title: `T${i}`, dueDate: daysFromNow(-1) })
    }

    const commands: string[] = []
    const listener = (event: { commandName: string; databaseName: string }): void => {
      if (event.databaseName !== 'admin') commands.push(event.commandName)
    }

    const client = mongoose.connection.getClient()
    client.on('commandStarted', listener)

    await getDashboard(user)

    client.off('commandStarted', listener)

    // Three aggregations: customers, deals, tasks. No per-record follow-ups.
    const aggregations = commands.filter((name) => name === 'aggregate')
    expect(aggregations).toHaveLength(3)
    expect(commands.filter((name) => name === 'find')).toHaveLength(0)
  })
})
