import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { json, mockApi } from '../../__tests__/apiMock'
import { renderWithProviders } from '../../__tests__/renderWithProviders'
import { stats, USER } from '../../fixtures'
import { DashboardPage } from './pages/DashboardPage'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const AUTHED = { 'GET /auth/me': () => json(200, { user: USER }) }

describe('dashboard integration', () => {
  it('renders the four metrics from GET /api/stats', async () => {
    mockApi({ ...AUTHED, 'GET /stats': () => json(200, stats()) })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('$12,346')).toBeDefined()
    expect(screen.getByText('50')).toBeDefined()
    expect(screen.getByText('30')).toBeDefined()
    expect(screen.getByText('4')).toBeDefined()
  })

  it('calls the stats endpoint exactly once per mount', async () => {
    const { calls } = mockApi({ ...AUTHED, 'GET /stats': () => json(200, stats()) })

    renderWithProviders(<DashboardPage />)
    await screen.findByText('$12,346')

    expect(calls.filter((call) => call.url.includes('/stats'))).toHaveLength(1)
  })

  it('renders the recent orders returned by the API', async () => {
    mockApi({ ...AUTHED, 'GET /stats': () => json(200, stats()) })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Natali Craig')).toBeDefined()
    expect(screen.getByText('Delivered')).toBeDefined()
  })

  it('shows an empty state when there are no recent orders', async () => {
    mockApi({
      ...AUTHED,
      'GET /stats': () => json(200, stats({ recentOrders: [] })),
    })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('No orders yet')).toBeDefined()
  })

  it('survives an empty chart series without crashing', async () => {
    mockApi({
      ...AUTHED,
      'GET /stats': () => json(200, stats({ dailyOrders: [] })),
    })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('heading', { name: 'Revenue Trend' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Orders per Day' })).toBeDefined()
  })

  it('survives a response missing the chart and orders fields entirely', async () => {
    mockApi({
      ...AUTHED,
      'GET /stats': () =>
        json(200, { totalProducts: 1, totalOrders: 0, revenue: 0, lowStockCount: 0 }),
    })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('No orders yet')).toBeDefined()
  })

  it('shows an error state and retries on request', async () => {
    const user = userEvent.setup()
    let attempt = 0
    mockApi({
      ...AUTHED,
      'GET /stats': () => {
        attempt += 1
        return attempt === 1
          ? json(500, { error: { message: 'Internal server error' } })
          : json(200, stats())
      },
    })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('$12,346')).toBeDefined()
  })
})
