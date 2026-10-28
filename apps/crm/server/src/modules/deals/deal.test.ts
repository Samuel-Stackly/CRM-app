import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import {
  createCustomer,
  createDeal,
  createTwoUsers,
  createUser,
  type TestUser,
} from '../../__tests__/helpers.js'

/** A user with one customer, the common starting point for deal tests. */
async function userWithCustomer(email?: string): Promise<[TestUser, string]> {
  const user = await createUser(email)
  const customer = await createCustomer(user)
  return [user, customer['id'] as string]
}

describe('Deals — authentication', () => {
  it('rejects every endpoint without a session', async () => {
    const id = '6711a2b3c4d5e6f701234567'

    await request(app).get('/api/deals').expect(401)
    await request(app).get('/api/deals/stages').expect(401)
    await request(app).post('/api/deals').send({ title: 'X' }).expect(401)
    await request(app).get(`/api/deals/${id}`).expect(401)
    await request(app).patch(`/api/deals/${id}`).send({ title: 'X' }).expect(401)
    await request(app).delete(`/api/deals/${id}`).expect(401)
  })
})

describe('GET /api/deals/stages', () => {
  it('returns the five stages in board order with open flags', async () => {
    const user = await createUser()

    const response = await request(app).get('/api/deals/stages').set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.stages.map((s: { value: string }) => s.value)).toEqual([
      'Lead',
      'Qualified',
      'Proposal',
      'Won',
      'Lost',
    ])
    expect(response.body.stages.filter((s: { open: boolean }) => s.open)).toHaveLength(3)
  })

  it('is not shadowed by the :id route', async () => {
    const user = await createUser()
    // Would be a 404 "Deal not found" if '/stages' were parsed as an id.
    await request(app).get('/api/deals/stages').set('Cookie', user.cookie).expect(200)
  })
})

describe('POST /api/deals', () => {
  it('creates a deal with an embedded customer summary', async () => {
    const user = await createUser()
    const customer = await createCustomer(user, { name: 'Deanna Annis', company: 'Northwind' })

    const response = await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({
        title: 'Office fit-out',
        value: 6000,
        stage: 'Proposal',
        expectedCloseDate: '2026-11-14',
        customer: customer['id'],
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ title: 'Office fit-out', value: 6000, stage: 'Proposal' })
    expect(response.body.customer).toEqual({
      id: customer['id'],
      name: 'Deanna Annis',
      company: 'Northwind',
    })
    expect(response.body).not.toHaveProperty('owner')
  })

  it('defaults the stage to Lead', async () => {
    const [user, customerId] = await userWithCustomer()
    const deal = await createDeal(user, customerId)
    expect(deal['stage']).toBe('Lead')
  })

  it('requires title, value and customer', async () => {
    const user = await createUser()

    const response = await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({})

    expect(response.status).toBe(400)
    const paths = response.body.error.details.map((d: { path: string }) => d.path)
    expect(paths).toEqual(expect.arrayContaining(['title', 'value', 'customer']))
  })

  it('rejects a negative value and a non-numeric value', async () => {
    const [user, customerId] = await userWithCustomer()

    await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: -1, customer: customerId })
      .expect(400)

    await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: 'free', customer: customerId })
      .expect(400)
  })

  it('rejects unknown keys, including a client-supplied wonAt', async () => {
    const [user, customerId] = await userWithCustomer()

    await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: 1, customer: customerId, wonAt: '2020-01-01' })
      .expect(400)

    await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: 1, customer: customerId, owner: '6711a2b3c4d5e6f701234567' })
      .expect(400)
  })
})

describe('Stage validation', () => {
  it('accepts each of the five stages', async () => {
    const [user, customerId] = await userWithCustomer()

    for (const stage of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      const deal = await createDeal(user, customerId, { stage })
      expect(deal['stage']).toBe(stage)
    }
  })

  it('rejects an unknown stage, and is case-sensitive', async () => {
    const [user, customerId] = await userWithCustomer()

    const bogus = await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: 1, stage: 'Negotiation', customer: customerId })

    expect(bogus.status).toBe(400)
    expect(bogus.body.error.details[0].path).toBe('stage')

    await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: 1, stage: 'won', customer: customerId })
      .expect(400)
  })

  it('persists a stage change made through PATCH', async () => {
    const [user, customerId] = await userWithCustomer()
    const deal = await createDeal(user, customerId)
    const id = deal['id'] as string

    const patched = await request(app)
      .patch(`/api/deals/${id}`)
      .set('Cookie', user.cookie)
      .send({ stage: 'Won' })

    expect(patched.status).toBe(200)
    expect(patched.body.stage).toBe('Won')

    // Re-read to prove it reached the database, not just the response.
    const reread = await request(app).get(`/api/deals/${id}`).set('Cookie', user.cookie)
    expect(reread.body.stage).toBe('Won')
  })

  it('allows any stage transition, including backwards', async () => {
    const [user, customerId] = await userWithCustomer()
    const deal = await createDeal(user, customerId, { stage: 'Won' })
    const id = deal['id'] as string

    await request(app)
      .patch(`/api/deals/${id}`)
      .set('Cookie', user.cookie)
      .send({ stage: 'Lead' })
      .expect(200)
  })
})

describe('Customer ownership', () => {
  it('rejects a deal referencing another user\'s customer', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA, { name: 'A Contact' })

    const response = await request(app)
      .post('/api/deals')
      .set('Cookie', userB.cookie)
      .send({ title: 'Poached', value: 100, customer: customerA['id'] })

    expect(response.status).toBe(400)
    expect(response.body.error.details[0]).toEqual({
      path: 'customer',
      message: 'Customer not found',
    })
  })

  it('reports a foreign customer identically to a non-existent one', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)

    const foreign = await request(app)
      .post('/api/deals')
      .set('Cookie', userB.cookie)
      .send({ title: 'X', value: 1, customer: customerA['id'] })

    const missing = await request(app)
      .post('/api/deals')
      .set('Cookie', userB.cookie)
      .send({ title: 'X', value: 1, customer: '6711a2b3c4d5e6f701234567' })

    expect(foreign.body).toEqual(missing.body)
  })

  it('rejects a malformed customer id with 400', async () => {
    const user = await createUser()

    await request(app)
      .post('/api/deals')
      .set('Cookie', user.cookie)
      .send({ title: 'X', value: 1, customer: 'not-an-id' })
      .expect(400)
  })

  it('validates customer ownership on update too', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    const customerB = await createCustomer(userB)
    const dealB = await createDeal(userB, customerB['id'] as string)

    await request(app)
      .patch(`/api/deals/${dealB['id'] as string}`)
      .set('Cookie', userB.cookie)
      .send({ customer: customerA['id'] })
      .expect(400)
  })
})

describe('GET /api/deals — filtering and pagination', () => {
  it('returns pagination metadata', async () => {
    const [user, customerId] = await userWithCustomer()
    for (let i = 0; i < 12; i += 1) {
      await createDeal(user, customerId, { title: `Deal ${i}` })
    }

    const response = await request(app)
      .get('/api/deals?page=2&limit=5')
      .set('Cookie', user.cookie)

    expect(response.body.data).toHaveLength(5)
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    })
  })

  it('filters by stage and by customer', async () => {
    const user = await createUser()
    const first = await createCustomer(user, { name: 'First' })
    const second = await createCustomer(user, { name: 'Second' })

    await createDeal(user, first['id'] as string, { stage: 'Won' })
    await createDeal(user, first['id'] as string, { stage: 'Lead' })
    await createDeal(user, second['id'] as string, { stage: 'Won' })

    const byStage = await request(app).get('/api/deals?stage=Won').set('Cookie', user.cookie)
    expect(byStage.body.pagination.total).toBe(2)

    const byCustomer = await request(app)
      .get(`/api/deals?customer=${second['id'] as string}`)
      .set('Cookie', user.cookie)
    expect(byCustomer.body.pagination.total).toBe(1)
  })

  it('searches the title and treats input as text', async () => {
    const [user, customerId] = await userWithCustomer()
    await createDeal(user, customerId, { title: 'Office fit-out' })
    await createDeal(user, customerId, { title: 'Warehouse lease' })

    const found = await request(app).get('/api/deals?search=office').set('Cookie', user.cookie)
    expect(found.body.data).toHaveLength(1)

    const regex = await request(app).get('/api/deals?search=.%2A').set('Cookie', user.cookie)
    expect(regex.body.data).toEqual([])
  })

  it('sorts by value', async () => {
    const [user, customerId] = await userWithCustomer()
    await createDeal(user, customerId, { title: 'Big', value: 9000 })
    await createDeal(user, customerId, { title: 'Small', value: 10 })

    const response = await request(app).get('/api/deals?sort=value').set('Cookie', user.cookie)
    expect(response.body.data.map((d: { value: number }) => d.value)).toEqual([10, 9000])
  })

  it('rejects invalid query parameters', async () => {
    const user = await createUser()

    await request(app).get('/api/deals?stage=Bogus').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/deals?limit=500').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/deals?customer=nope').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/deals?groupBy=customer').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/deals?unknown=1').set('Cookie', user.cookie).expect(400)
  })
})

describe('GET /api/deals?groupBy=stage — pipeline board', () => {
  it('returns all five stages even when empty, with per-column totals', async () => {
    const [user, customerId] = await userWithCustomer()
    await createDeal(user, customerId, { stage: 'Lead', value: 100 })
    await createDeal(user, customerId, { stage: 'Lead', value: 200 })
    await createDeal(user, customerId, { stage: 'Won', value: 1000 })

    const response = await request(app)
      .get('/api/deals?groupBy=stage')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.stages).toHaveLength(5)
    expect(response.body).not.toHaveProperty('pagination')

    const byStage = Object.fromEntries(
      response.body.stages.map((column: { stage: string }) => [column.stage, column]),
    )

    expect(byStage['Lead']).toMatchObject({ count: 2, totalValue: 300 })
    expect(byStage['Lead'].deals).toHaveLength(2)
    expect(byStage['Won']).toMatchObject({ count: 1, totalValue: 1000 })
    // Empty columns are present rather than omitted.
    expect(byStage['Qualified']).toMatchObject({ count: 0, totalValue: 0, deals: [] })
    expect(byStage['Lost']).toMatchObject({ count: 0, totalValue: 0, deals: [] })
  })

  it('excludes another user\'s deals from the board', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    const customerB = await createCustomer(userB)

    await createDeal(userA, customerA['id'] as string, { stage: 'Lead', value: 500 })
    await createDeal(userB, customerB['id'] as string, { stage: 'Lead', value: 70 })

    const board = await request(app)
      .get('/api/deals?groupBy=stage')
      .set('Cookie', userB.cookie)

    const lead = board.body.stages.find((c: { stage: string }) => c.stage === 'Lead')
    expect(lead).toMatchObject({ count: 1, totalValue: 70 })
  })
})

describe('GET / PATCH / DELETE /api/deals/:id', () => {
  it('reads, updates and deletes', async () => {
    const [user, customerId] = await userWithCustomer()
    const deal = await createDeal(user, customerId)
    const id = deal['id'] as string

    await request(app).get(`/api/deals/${id}`).set('Cookie', user.cookie).expect(200)

    const patched = await request(app)
      .patch(`/api/deals/${id}`)
      .set('Cookie', user.cookie)
      .send({ title: 'Renamed' })
    expect(patched.body.title).toBe('Renamed')
    expect(patched.body.value).toBe(6000)

    await request(app).delete(`/api/deals/${id}`).set('Cookie', user.cookie).expect(204)
    await request(app).get(`/api/deals/${id}`).set('Cookie', user.cookie).expect(404)
  })

  it('returns 404 for a missing id and for a malformed id', async () => {
    const user = await createUser()

    const missing = await request(app)
      .get('/api/deals/6711a2b3c4d5e6f701234567')
      .set('Cookie', user.cookie)
    expect(missing.status).toBe(404)
    expect(missing.body.error.message).toBe('Deal not found')

    const malformed = await request(app).get('/api/deals/nope').set('Cookie', user.cookie)
    expect(malformed.status).toBe(404)
    expect(malformed.body.error.message).toBe('Deal not found')
  })

  it('rejects an empty PATCH body', async () => {
    const [user, customerId] = await userWithCustomer()
    const deal = await createDeal(user, customerId)

    await request(app)
      .patch(`/api/deals/${deal['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({})
      .expect(400)
  })
})

describe('Cross-user access prevention', () => {
  it('hides another user\'s deal from read, update and delete', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    const deal = await createDeal(userA, customerA['id'] as string, { title: 'Private Deal' })
    const id = deal['id'] as string

    const read = await request(app).get(`/api/deals/${id}`).set('Cookie', userB.cookie)
    const update = await request(app)
      .patch(`/api/deals/${id}`)
      .set('Cookie', userB.cookie)
      .send({ stage: 'Lost' })
    const remove = await request(app).delete(`/api/deals/${id}`).set('Cookie', userB.cookie)

    expect(read.status).toBe(404)
    expect(update.status).toBe(404)
    expect(remove.status).toBe(404)

    const missing = await request(app)
      .get('/api/deals/6711a2b3c4d5e6f701234567')
      .set('Cookie', userB.cookie)
    expect(read.body).toEqual(missing.body)

    // Untouched for the real owner.
    const original = await request(app).get(`/api/deals/${id}`).set('Cookie', userA.cookie)
    expect(original.status).toBe(200)
    expect(original.body.title).toBe('Private Deal')
    expect(original.body.stage).toBe('Lead')
  })

  it('excludes another user\'s deals from the list and from search', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    const customerB = await createCustomer(userB)

    await createDeal(userA, customerA['id'] as string, { title: 'Secret Deal' })
    await createDeal(userB, customerB['id'] as string, { title: 'Own Deal' })

    const list = await request(app).get('/api/deals').set('Cookie', userB.cookie)
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].title).toBe('Own Deal')

    const search = await request(app).get('/api/deals?search=secret').set('Cookie', userB.cookie)
    expect(search.body.data).toEqual([])
  })

  it('cannot filter by another user\'s customer to reach their deals', async () => {
    const [userA, userB] = await createTwoUsers()
    const customerA = await createCustomer(userA)
    await createDeal(userA, customerA['id'] as string, { title: 'Hidden' })

    const response = await request(app)
      .get(`/api/deals?customer=${customerA['id'] as string}`)
      .set('Cookie', userB.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })
})
