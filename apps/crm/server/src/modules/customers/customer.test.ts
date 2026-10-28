import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { createCustomer, createTwoUsers, createUser } from '../../__tests__/helpers.js'

describe('Customers — authentication', () => {
  it('rejects every endpoint without a session', async () => {
    const id = '6711a2b3c4d5e6f701234567'

    await request(app).get('/api/customers').expect(401)
    await request(app).post('/api/customers').send({ name: 'X' }).expect(401)
    await request(app).get(`/api/customers/${id}`).expect(401)
    await request(app).patch(`/api/customers/${id}`).send({ name: 'X' }).expect(401)
    await request(app).delete(`/api/customers/${id}`).expect(401)
  })
})

describe('POST /api/customers', () => {
  it('creates a customer and never exposes the owner', async () => {
    const user = await createUser()

    const response = await request(app)
      .post('/api/customers')
      .set('Cookie', user.cookie)
      .send({
        name: 'Deanna Annis',
        company: 'Northwind Ltd',
        email: '  Deanna@Example.COM ',
        phone: '999-999-9999',
        status: 'active',
        notes: 'Prefers email.',
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      name: 'Deanna Annis',
      company: 'Northwind Ltd',
      email: 'deanna@example.com',
      status: 'active',
    })
    expect(response.body.id).toBeTypeOf('string')
    expect(response.body).not.toHaveProperty('owner')
    expect(response.body).not.toHaveProperty('_id')
  })

  it('defaults status when omitted', async () => {
    const user = await createUser()
    const customer = await createCustomer(user)
    expect(customer['status']).toBe('lead')
  })

  it('rejects a missing name with 400 and field details', async () => {
    const user = await createUser()

    const response = await request(app)
      .post('/api/customers')
      .set('Cookie', user.cookie)
      .send({ company: 'Northwind' })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Validation failed')
    expect(response.body.error.details[0].path).toBe('name')
  })

  it('rejects an invalid status and an invalid email', async () => {
    const user = await createUser()

    await request(app)
      .post('/api/customers')
      .set('Cookie', user.cookie)
      .send({ name: 'X', status: 'archived' })
      .expect(400)

    await request(app)
      .post('/api/customers')
      .set('Cookie', user.cookie)
      .send({ name: 'X', email: 'not-an-email' })
      .expect(400)
  })

  it('rejects unknown keys, so owner cannot be forged', async () => {
    const user = await createUser()

    const response = await request(app)
      .post('/api/customers')
      .set('Cookie', user.cookie)
      .send({ name: 'X', owner: '6711a2b3c4d5e6f701234567' })

    expect(response.status).toBe(400)
  })
})

describe('GET /api/customers — pagination, search, filtering', () => {
  it('returns pagination metadata', async () => {
    const user = await createUser()
    for (let i = 0; i < 25; i += 1) {
      await createCustomer(user, { name: `Customer ${i}` })
    }

    const response = await request(app)
      .get('/api/customers?page=2&limit=10')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(10)
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    })
  })

  it('reports an empty result rather than 404 when nothing matches', async () => {
    const user = await createUser()

    const response = await request(app)
      .get('/api/customers?search=nobody')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
    expect(response.body.pagination).toMatchObject({
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    })
  })

  it('returns an empty page beyond the last one, not an error', async () => {
    const user = await createUser()
    await createCustomer(user)

    const response = await request(app)
      .get('/api/customers?page=99')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it('searches name, company and email case-insensitively', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'Deanna Annis', email: 'deanna@example.com' })
    await createCustomer(user, { name: 'George Gamble', company: 'Northwind Ltd' })
    await createCustomer(user, { name: 'Unrelated Person' })

    const byName = await request(app).get('/api/customers?search=annis').set('Cookie', user.cookie)
    expect(byName.body.data).toHaveLength(1)
    expect(byName.body.data[0].name).toBe('Deanna Annis')

    const byCompany = await request(app)
      .get('/api/customers?search=northwind')
      .set('Cookie', user.cookie)
    expect(byCompany.body.data).toHaveLength(1)
    expect(byCompany.body.data[0].name).toBe('George Gamble')

    const byEmail = await request(app)
      .get('/api/customers?search=DEANNA@example')
      .set('Cookie', user.cookie)
    expect(byEmail.body.data).toHaveLength(1)
  })

  it('treats search input as text, not as a regular expression', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'Alpha' })
    await createCustomer(user, { name: 'Beta' })

    // Would match everything if the input were compiled as a pattern.
    const response = await request(app)
      .get('/api/customers?search=.%2A')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it('filters by status', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'A', status: 'active' })
    await createCustomer(user, { name: 'B', status: 'inactive' })
    await createCustomer(user, { name: 'C', status: 'active' })

    const response = await request(app)
      .get('/api/customers?status=active')
      .set('Cookie', user.cookie)

    expect(response.body.data).toHaveLength(2)
    expect(response.body.pagination.total).toBe(2)
  })

  it('composes search, status and pagination together', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'Acme One', status: 'active' })
    await createCustomer(user, { name: 'Acme Two', status: 'active' })
    await createCustomer(user, { name: 'Acme Three', status: 'inactive' })
    await createCustomer(user, { name: 'Other', status: 'active' })

    const response = await request(app)
      .get('/api/customers?search=acme&status=active&page=1&limit=1')
      .set('Cookie', user.cookie)

    // Two match search+status; one returned because limit is 1.
    expect(response.body.data).toHaveLength(1)
    expect(response.body.pagination).toMatchObject({ total: 2, totalPages: 2, hasNextPage: true })
  })

  it('sorts by name when asked', async () => {
    const user = await createUser()
    await createCustomer(user, { name: 'Zoe' })
    await createCustomer(user, { name: 'Adam' })

    const response = await request(app)
      .get('/api/customers?sort=name')
      .set('Cookie', user.cookie)

    expect(response.body.data.map((c: { name: string }) => c.name)).toEqual(['Adam', 'Zoe'])
  })

  it('rejects invalid query parameters with 400', async () => {
    const user = await createUser()

    await request(app).get('/api/customers?page=0').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/customers?limit=500').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/customers?status=bogus').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/customers?sort=password').set('Cookie', user.cookie).expect(400)
    await request(app).get('/api/customers?unknown=1').set('Cookie', user.cookie).expect(400)
  })
})

describe('GET /api/customers/:id', () => {
  it('returns the customer', async () => {
    const user = await createUser()
    const created = await createCustomer(user)

    const response = await request(app)
      .get(`/api/customers/${created['id'] as string}`)
      .set('Cookie', user.cookie)

    expect(response.status).toBe(200)
    expect(response.body.customer).toMatchObject({ id: created['id'], name: 'Deanna Annis' })
  })

  it('returns 404 for a non-existent id', async () => {
    const user = await createUser()

    const response = await request(app)
      .get('/api/customers/6711a2b3c4d5e6f701234567')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('Customer not found')
  })

  it('returns 404 — not 400 — for a malformed id', async () => {
    const user = await createUser()

    const response = await request(app)
      .get('/api/customers/not-an-object-id')
      .set('Cookie', user.cookie)

    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('Customer not found')
  })
})

describe('PATCH /api/customers/:id', () => {
  it('applies a partial update', async () => {
    const user = await createUser()
    const created = await createCustomer(user, { company: 'Northwind' })

    const response = await request(app)
      .patch(`/api/customers/${created['id'] as string}`)
      .set('Cookie', user.cookie)
      .send({ status: 'inactive' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('inactive')
    // Untouched fields survive.
    expect(response.body.company).toBe('Northwind')
  })

  it('rejects an empty body and an invalid value', async () => {
    const user = await createUser()
    const created = await createCustomer(user)
    const id = created['id'] as string

    await request(app).patch(`/api/customers/${id}`).set('Cookie', user.cookie).send({}).expect(400)
    await request(app)
      .patch(`/api/customers/${id}`)
      .set('Cookie', user.cookie)
      .send({ status: 'bogus' })
      .expect(400)
  })

  it('returns 404 for a non-existent id', async () => {
    const user = await createUser()

    await request(app)
      .patch('/api/customers/6711a2b3c4d5e6f701234567')
      .set('Cookie', user.cookie)
      .send({ name: 'New' })
      .expect(404)
  })
})

describe('DELETE /api/customers/:id', () => {
  it('deletes the customer', async () => {
    const user = await createUser()
    const created = await createCustomer(user)
    const id = created['id'] as string

    await request(app).delete(`/api/customers/${id}`).set('Cookie', user.cookie).expect(204)
    await request(app).get(`/api/customers/${id}`).set('Cookie', user.cookie).expect(404)
  })

  it('returns 404 when deleting twice', async () => {
    const user = await createUser()
    const created = await createCustomer(user)
    const id = created['id'] as string

    await request(app).delete(`/api/customers/${id}`).set('Cookie', user.cookie).expect(204)
    await request(app).delete(`/api/customers/${id}`).set('Cookie', user.cookie).expect(404)
  })
})

describe('Cross-user access prevention', () => {
  it('hides another user\'s customer from read, update and delete with an identical 404', async () => {
    const [userA, userB] = await createTwoUsers()
    const customer = await createCustomer(userA, { name: 'Private Contact' })
    const id = customer['id'] as string

    const read = await request(app).get(`/api/customers/${id}`).set('Cookie', userB.cookie)
    const update = await request(app)
      .patch(`/api/customers/${id}`)
      .set('Cookie', userB.cookie)
      .send({ name: 'Hijacked' })
    const remove = await request(app).delete(`/api/customers/${id}`).set('Cookie', userB.cookie)

    expect(read.status).toBe(404)
    expect(update.status).toBe(404)
    expect(remove.status).toBe(404)

    // The body must not distinguish "someone else's" from "does not exist".
    const missing = await request(app)
      .get('/api/customers/6711a2b3c4d5e6f701234567')
      .set('Cookie', userB.cookie)
    expect(read.body).toEqual(missing.body)

    // And the record is untouched.
    const original = await request(app).get(`/api/customers/${id}`).set('Cookie', userA.cookie)
    expect(original.status).toBe(200)
    expect(original.body.customer.name).toBe('Private Contact')
  })

  it('excludes another user\'s customers from the list', async () => {
    const [userA, userB] = await createTwoUsers()
    await createCustomer(userA, { name: 'A Contact' })
    await createCustomer(userA, { name: 'A Second' })
    await createCustomer(userB, { name: 'B Contact' })

    const listB = await request(app).get('/api/customers').set('Cookie', userB.cookie)

    expect(listB.body.data).toHaveLength(1)
    expect(listB.body.data[0].name).toBe('B Contact')
    expect(listB.body.pagination.total).toBe(1)
  })

  it('does not leak another user\'s customers through search', async () => {
    const [userA, userB] = await createTwoUsers()
    await createCustomer(userA, { name: 'Secret Lead', company: 'Hidden Corp' })

    const response = await request(app)
      .get('/api/customers?search=secret')
      .set('Cookie', userB.cookie)

    expect(response.body.data).toEqual([])
    expect(response.body.pagination.total).toBe(0)
  })
})
