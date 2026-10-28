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
} from '../../__tests__/helpers.js'

describe('Tasks — authentication', () => {
  it('rejects every endpoint without a session', async () => {
    const id = '6711a2b3c4d5e6f701234567'

    await request(app).get('/api/tasks').expect(401)
    await request(app).post('/api/tasks').send({ title: 'X' }).expect(401)
    await request(app).get(`/api/tasks/${id}`).expect(401)
    await request(app).patch(`/api/tasks/${id}`).send({ title: 'X' }).expect(401)
    await request(app).delete(`/api/tasks/${id}`).expect(401)
  })
})

describe('POST /api/tasks', () => {
  it('creates a task with defaults', async () => {
    const user = await createUser()

    const response = await request(app)
      .post('/api/tasks')
      .set('Cookie', user.cookie)
      .send({ title: 'Send revised quote', dueDate: daysFromNow(3) })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      title: 'Send revised quote',
      priority: 'medium',
      done: false,
      overdue: false,
      customer: null,
      deal: null,
    })
    expect(response.body.completedAt).toBeNull()
    expect(response.body).not.toHaveProperty('owner')
    expect(response.body).not.toHaveProperty('priorityRank')
  })

  it('accepts a description and links to a customer and a deal', async () => {
    const user = await createUser()
    const customer = await createCustomer(user, { name: 'Deanna Annis' })
    const deal = await createDeal(user, customer['id'] as string, { title: 'Office fit-out' })

    const response = await request(app)
      .post('/api/tasks')
      .set('Cookie', user.cookie)
      .send({
        title: 'Follow up',
        description: 'Call before the site visit.',
        dueDate: daysFromNow(2),
        priority: 'high',
        customer: customer['id'],
        deal: deal['id'],
      })

    expect(response.status).toBe(201)
    expect(response.body.description).toBe('Call before the site visit.')
    expect(response.body.customer).toEqual({ id: customer['id'], name: 'Deanna Annis' })
    expect(response.body.deal).toEqual({ id: deal['id'], name: 'Office fit-out' })
  })

  it('requires a title and a due date', async () => {
    const user = await createUser()

    const response = await request(app).post('/api/tasks').set('Cookie', user.cookie).send({})

    expect(response.status).toBe(400)
    const paths = response.body.error.details.map((d: { path: string }) => d.path)
    expect(paths).toEqual(expect.arrayContaining(['title', 'dueDate']))
  })

  it('rejects an unparseable due date and an unknown priority', async () => {
    const user = await createUser()

    await request(app)
      .post('/api/tasks')
      .set('Cookie', user.cookie)
      .send({ title: 'X', dueDate: 'next tuesday-ish' })
      .expect(400)

    await request(app)
      .post('/api/tasks')
      .set('Cookie', user.cookie)
      .send({ title: 'X', dueDate: daysFromNow(1), priority: 'urgent' })
      .expect(400)
  })
})

describe('Overdue is calculated, never supplied', () => {
  it('rejects a client-supplied overdue value', async () => {
    const user = await createUser()

    const response = await request(app)
      .post('/api/tasks')
      .set('Cookie', user.cookie)
      .send({ title: 'X', dueDate: daysFromNow(-5), overdue: false })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Validation failed')
  })

  it('rejects a client-supplied completedAt', async () => {
    const user = await createUser()

    await request(app)
      .post('/api/tasks')
      .set('Cookie', user.cookie)
      .send({ title: 'X', dueDate: daysFromNow(1), completedAt: daysFromNow(0) })
      .expect(400)
  })

  it('marks a past-due incomplete task as overdue', async () => {
    const user = await createUser()
    const task = await createTask(user, { dueDate: daysFromNow(-1) })
    expect(task['overdue']).toBe(true)
  })

  it('does not mark a future task as overdue', async () => {
    const user = await createUser()
    const task = await createTask(user, { dueDate: daysFromNow(1) })
    expect(task['overdue']).toBe(false)
  })

  it('never marks a completed task overdue, however old', async () => {
    const user = await createUser()
    const task = await createTask(user, { dueDate: daysFromNow(-30) })
    expect(task['overdue']).toBe(true)

    const completed = await request(app)
      .patch(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({ done: true })

    expect(completed.body.done).toBe(true)
    expect(completed.body.overdue).toBe(false)
    expect(completed.body.completedAt).not.toBeNull()
  })

  it('becomes overdue again if completion is reversed', async () => {
    const user = await createUser()
    const task = await createTask(user, { dueDate: daysFromNow(-2), done: true })
    const id = task['id'] as string

    expect(task['overdue']).toBe(false)

    const reopened = await request(app)
      .patch(`/api/tasks/${id}`)
      .set('Cookie', user.cookie)
      .send({ done: false })

    expect(reopened.body.overdue).toBe(true)
    // The completion timestamp is cleared with it.
    expect(reopened.body.completedAt).toBeNull()
  })

  it('recomputes overdue on read, with no write in between', async () => {
    const user = await createUser()
    // Due one second ago: stored as not-yet-due would be wrong by the next read.
    const task = await createTask(user, {
      dueDate: new Date(Date.now() - 1000).toISOString(),
    })

    const reread = await request(app)
      .get(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', user.cookie)

    expect(reread.body.overdue).toBe(true)
  })

  it('flips overdue as the due date passes, without any update', async () => {
    const user = await createUser()
    // Due 50ms out, so it is not overdue at creation but is on the next read.
    const task = await createTask(user, { dueDate: new Date(Date.now() + 50).toISOString() })
    expect(task['overdue']).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 120))

    const reread = await request(app)
      .get(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', user.cookie)

    expect(reread.body.overdue).toBe(true)
  })
})

describe('GET /api/tasks — filtering and pagination', () => {
  it('returns pagination metadata', async () => {
    const user = await createUser()
    for (let i = 0; i < 14; i += 1) {
      await createTask(user, { title: `Task ${i}` })
    }

    const response = await request(app)
      .get('/api/tasks?page=2&limit=5')
      .set('Cookie', user.cookie)

    expect(response.body.data).toHaveLength(5)
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 14,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    })
  })

  it('filters by the derived overdue flag', async () => {
    const user = await createUser()
    await createTask(user, { title: 'Past due', dueDate: daysFromNow(-2) })
    await createTask(user, { title: 'Upcoming', dueDate: daysFromNow(5) })
    await createTask(user, { title: 'Done late', dueDate: daysFromNow(-3), done: true })

    const overdue = await request(app).get('/api/tasks?overdue=true').set('Cookie', user.cookie)
    expect(overdue.body.data).toHaveLength(1)
    expect(overdue.body.data[0].title).toBe('Past due')

    // The completed-but-late task counts as not overdue.
    const notOverdue = await request(app)
      .get('/api/tasks?overdue=false')
      .set('Cookie', user.cookie)
    expect(notOverdue.body.pagination.total).toBe(2)
  })

  it('filters by done and by priority', async () => {
    const user = await createUser()
    await createTask(user, { title: 'A', done: true, priority: 'high' })
    await createTask(user, { title: 'B', priority: 'high' })
    await createTask(user, { title: 'C', priority: 'low' })

    const done = await request(app).get('/api/tasks?done=true').set('Cookie', user.cookie)
    expect(done.body.pagination.total).toBe(1)

    const high = await request(app).get('/api/tasks?priority=high').set('Cookie', user.cookie)
    expect(high.body.pagination.total).toBe(2)
  })

  it('filters by customer and by deal', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const deal = await createDeal(user, customer['id'] as string)

    await createTask(user, { title: 'Linked', customer: customer['id'], deal: deal['id'] })
    await createTask(user, { title: 'Unlinked' })

    const byCustomer = await request(app)
      .get(`/api/tasks?customer=${customer['id'] as string}`)
      .set('Cookie', user.cookie)
    expect(byCustomer.body.pagination.total).toBe(1)

    const byDeal = await request(app)
      .get(`/api/tasks?deal=${deal['id'] as string}`)
      .set('Cookie', user.cookie)
    expect(byDeal.body.pagination.total).toBe(1)
  })

  it('filters by a due-date range', async () => {
    const user = await createUser()
    await createTask(user, { title: 'Soon', dueDate: daysFromNow(1) })
    await createTask(user, { title: 'Later', dueDate: daysFromNow(30) })

    const response = await request(app)
      .get(`/api/tasks?dueBefore=${daysFromNow(7)}`)
      .set('Cookie', user.cookie)

    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].title).toBe('Soon')
  })

  it('sorts by priority severity, not alphabetically', async () => {
    const user = await createUser()
    await createTask(user, { title: 'Low one', priority: 'low' })
    await createTask(user, { title: 'High one', priority: 'high' })
    await createTask(user, { title: 'Medium one', priority: 'medium' })

    const response = await request(app).get('/api/tasks?sort=priority').set('Cookie', user.cookie)

    // Alphabetical order would be high, low, medium — this must be by severity.
    expect(response.body.data.map((t: { priority: string }) => t.priority)).toEqual([
      'high',
      'medium',
      'low',
    ])
  })

  it('sorts by due date by default', async () => {
    const user = await createUser()
    await createTask(user, { title: 'Later', dueDate: daysFromNow(10) })
    await createTask(user, { title: 'Sooner', dueDate: daysFromNow(1) })

    const response = await request(app).get('/api/tasks').set('Cookie', user.cookie)
    expect(response.body.data.map((t: { title: string }) => t.title)).toEqual(['Sooner', 'Later'])
  })

  it('rejects invalid query parameters', async () => {
    const user = await createUser()

    await request(app).get('/api/tasks?priority=urgent').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/tasks?done=maybe').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/tasks?limit=500').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/tasks?customer=nope').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/tasks?unknown=1').set('Cookie', user.cookie).expect(400)
  })
})

describe('Reference ownership', () => {
  it('rejects a task referencing another user\'s customer or deal', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    const dealA = await createDeal(userA, customerA['id'] as string)

    const byCustomer = await request(app)
      .post('/api/tasks')
      .set('Cookie', userB.cookie)
      .send({ title: 'X', dueDate: daysFromNow(1), customer: customerA['id'] })

    expect(byCustomer.status).toBe(400)
    expect(byCustomer.body.error.details[0]).toEqual({
      path: 'customer',
      message: 'Customer not found',
    })

    const byDeal = await request(app)
      .post('/api/tasks')
      .set('Cookie', userB.cookie)
      .send({ title: 'X', dueDate: daysFromNow(1), deal: dealA['id'] })

    expect(byDeal.status).toBe(400)
    expect(byDeal.body.error.details[0].path).toBe('deal')
  })

  it('reports a foreign reference identically to a missing one', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)

    const foreign = await request(app)
      .post('/api/tasks')
      .set('Cookie', userB.cookie)
      .send({ title: 'X', dueDate: daysFromNow(1), customer: customerA['id'] })

    const missing = await request(app)
      .post('/api/tasks')
      .set('Cookie', userB.cookie)
      .send({ title: 'X', dueDate: daysFromNow(1), customer: '6711a2b3c4d5e6f701234567' })

    expect(foreign.body).toEqual(missing.body)
  })

  it('validates references on update too', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    const task = await createTask(userB)

    await request(app)
      .patch(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', userB.cookie)
      .send({ customer: customerA['id'] })
      .expect(400)
  })

  it('clears a link when null is sent', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    const task = await createTask(user, { customer: customer['id'] })
    expect(task['customer']).not.toBeNull()

    const cleared = await request(app)
      .patch(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({ customer: null })

    expect(cleared.body.customer).toBeNull()
  })
})

describe('GET / PATCH / DELETE /api/tasks/:id', () => {
  it('reads, updates and deletes', async () => {
    const user = await createUser()
    const task = await createTask(user)
    const id = task['id'] as string

    await request(app).get(`/api/tasks/${id}`).set('Cookie', user.cookie).expect(200)

    const patched = await request(app)
      .patch(`/api/tasks/${id}`)
      .set('Cookie', user.cookie)
      .send({ title: 'Renamed', priority: 'high' })
    expect(patched.body).toMatchObject({ title: 'Renamed', priority: 'high' })

    await request(app).delete(`/api/tasks/${id}`).set('Cookie', user.cookie).expect(204)
    await request(app).get(`/api/tasks/${id}`).set('Cookie', user.cookie).expect(404)
  })

  it('returns 404 for a missing id and a malformed id', async () => {
    const user = await createUser()

    const missing = await request(app)
      .get('/api/tasks/6711a2b3c4d5e6f701234567')
      .set('Cookie', user.cookie)
    expect(missing.status).toBe(404)
    expect(missing.body.error.message).toBe('Task not found')

    const malformed = await request(app).get('/api/tasks/nope').set('Cookie', user.cookie)
    expect(malformed.status).toBe(404)
    expect(malformed.body.error.message).toBe('Task not found')
  })

  it('rejects an empty PATCH body', async () => {
    const user = await createUser()
    const task = await createTask(user)

    await request(app)
      .patch(`/api/tasks/${task['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({})
      .expect(400)
  })
})

describe('Cross-user access prevention', () => {
  it('hides another user\'s task from read, update and delete', async () => {
    const [userA, userB] = await createTwoUsers()
    const task = await createTask(userA, { title: 'Private Task' })
    const id = task['id'] as string

    const read = await request(app).get(`/api/tasks/${id}`).set('Cookie', userB.cookie)
    const update = await request(app)
      .patch(`/api/tasks/${id}`)
      .set('Cookie', userB.cookie)
      .send({ done: true })
    const remove = await request(app).delete(`/api/tasks/${id}`).set('Cookie', userB.cookie)

    expect(read.status).toBe(404)
    expect(update.status).toBe(404)
    expect(remove.status).toBe(404)

    const missing = await request(app)
      .get('/api/tasks/6711a2b3c4d5e6f701234567')
      .set('Cookie', userB.cookie)
    expect(read.body).toEqual(missing.body)

    const original = await request(app).get(`/api/tasks/${id}`).set('Cookie', userA.cookie)
    expect(original.status).toBe(200)
    expect(original.body.title).toBe('Private Task')
    expect(original.body.done).toBe(false)
  })

  it('excludes another user\'s tasks from the list and from overdue filters', async () => {
    const [userA, userB] = await createTwoUsers()
    await createTask(userA, { title: 'A overdue', dueDate: daysFromNow(-1) })
    await createTask(userB, { title: 'B task' })

    const list = await request(app).get('/api/tasks').set('Cookie', userB.cookie)
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].title).toBe('B task')

    const overdue = await request(app).get('/api/tasks?overdue=true').set('Cookie', userB.cookie)
    expect(overdue.body.data).toEqual([])
  })
})
