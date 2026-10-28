import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../app.js'

describe('health', () => {
  it('reports ok', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

describe('error handling', () => {
  it('renders an unmatched route as a 404 in the standard envelope', async () => {
    const response = await request(app).get('/api/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: { message: 'Not found' } })
  })

  it('reports malformed JSON as a 400, not a 500', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":')

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBeTruthy()
  })
})

describe('cors', () => {
  it('allows the configured client origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5174')

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174')
    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('tolerates a trailing slash on the configured origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5174/')

    expect(response.status).toBe(200)
  })

  it('rejects an unknown origin with 403', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com')

    expect(response.status).toBe(403)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('sets security headers from helmet', async () => {
    const response = await request(app).get('/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})
