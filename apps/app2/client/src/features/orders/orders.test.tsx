import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { json, mockApi } from '../../__tests__/apiMock'
import { renderWithProviders } from '../../__tests__/renderWithProviders'
import { order, USER } from '../../fixtures'
import type { Order } from '../../types/models'
import { OrdersPage } from './pages/OrdersPage'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const AUTHED = { 'GET /auth/me': () => json(200, { user: USER }) }

function page(orders: Order[], overrides: Record<string, unknown> = {}) {
  return json(200, {
    data: orders,
    pagination: {
      page: 1,
      limit: 10,
      total: orders.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      ...overrides,
    },
  })
}

describe('orders listing', () => {
  it('renders orders from GET /api/orders', async () => {
    mockApi({ ...AUTHED, 'GET /orders': () => page([order()]) })

    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('#SD-4001')).toBeDefined()
    expect(screen.getByText('Natali Craig')).toBeDefined()
    expect(screen.getByText('$249.99')).toBeDefined()
  })

  it('summarises the items on an order', async () => {
    mockApi({
      ...AUTHED,
      'GET /orders': () =>
        page([
          order({
            items: [
              { productId: 'p1', name: 'Headphones', quantity: 2, price: 10 },
              { productId: 'p2', name: 'Cable', quantity: 1, price: 5 },
            ],
          }),
        ]),
    })

    renderWithProviders(<OrdersPage />)

    // Quantities are summed, not the number of line entries.
    expect(await screen.findAllByText('3 items')).toBeDefined()
  })

  it('shows a status badge', async () => {
    mockApi({ ...AUTHED, 'GET /orders': () => page([order({ status: 'Delivered' })]) })

    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('Delivered')).toBeDefined()
  })

  it('shows an empty state', async () => {
    mockApi({ ...AUTHED, 'GET /orders': () => page([]) })

    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('No orders yet')).toBeDefined()
  })

  it('distinguishes a filtered empty result', async () => {
    mockApi({ ...AUTHED, 'GET /orders': () => page([]) })

    renderWithProviders(<OrdersPage />, '/orders?status=Cancelled')

    expect(await screen.findByText('No matching orders')).toBeDefined()
  })

  it('shows an error state and retries', async () => {
    const user = userEvent.setup()
    let attempt = 0
    mockApi({
      ...AUTHED,
      'GET /orders': () => {
        attempt += 1
        return attempt === 1
          ? json(500, { error: { message: 'Internal server error' } })
          : page([order()])
      },
    })

    renderWithProviders(<OrdersPage />)

    expect(await screen.findByRole('alert')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('#SD-4001')).toBeDefined()
  })
})

describe('status filtering', () => {
  it('sends the status to the API', async () => {
    const { calls } = mockApi({ ...AUTHED, 'GET /orders': () => page([order()]) })

    renderWithProviders(<OrdersPage />, '/orders?status=Shipped')
    await screen.findByText('#SD-4001')

    expect(calls.filter((call) => call.url.includes('/orders')).at(-1)!.url).toContain(
      'status=Shipped',
    )
  })

  it('refetches when the filter changes', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({ ...AUTHED, 'GET /orders': () => page([order()]) })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    await user.selectOptions(screen.getByLabelText('Status'), 'Cancelled')

    await waitFor(() => {
      expect(calls.filter((call) => call.url.includes('/orders')).at(-1)!.url).toContain(
        'status=Cancelled',
      )
    })
  })

  it('clears the filter', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({ ...AUTHED, 'GET /orders': () => page([order()]) })

    renderWithProviders(<OrdersPage />, '/orders?status=Pending')
    await screen.findByText('#SD-4001')

    await user.click(screen.getByRole('button', { name: 'Clear filter' }))

    await waitFor(() => {
      expect(calls.filter((call) => call.url.includes('/orders')).at(-1)!.url).not.toContain(
        'status=',
      )
    })
  })

  it('paginates server-side using the response metadata', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /orders': () => page([order()], { total: 25, totalPages: 3, hasNextPage: true }),
    })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => {
      expect(calls.filter((call) => call.url.includes('/orders')).at(-1)!.url).toContain(
        'page=2',
      )
    })
  })
})

describe('status updates', () => {
  it('PATCHes the new status and updates the row from the response', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /orders': () => page([order({ status: 'Pending' })]),
      'PATCH /orders': () => json(200, { order: order({ status: 'Shipped' }) }),
    })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    await user.selectOptions(screen.getByLabelText('Status for order SD-4001'), 'Shipped')

    expect(await screen.findByText('Order #SD-4001 marked Shipped')).toBeDefined()

    const patch = calls.find((call) => call.method === 'PATCH')!
    expect(patch.url).toContain('/orders/o1/status')
    expect(patch.body).toEqual({ status: 'Shipped' })

    // The row reflects the server's answer without a refetch. Asserting on the
    // select's value rather than the pill text, because "Shipped" is also an
    // <option> label in every row.
    await waitFor(() => {
      expect(screen.getByLabelText('Status for order SD-4001')).toHaveProperty(
        'value',
        'Shipped',
      )
    })
  })

  it('reports a failed update and leaves the status alone', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'GET /orders': () => page([order({ status: 'Pending' })]),
      'PATCH /orders': () => json(400, { error: { message: 'Unknown order status' } }),
    })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    await user.selectOptions(screen.getByLabelText('Status for order SD-4001'), 'Delivered')

    expect(await screen.findByText('Unknown order status')).toBeDefined()
    expect(screen.getByLabelText('Status for order SD-4001')).toHaveProperty(
      'value',
      'Pending',
    )
  })

  it('disables the control while an update is in flight, preventing a double submit', async () => {
    const user = userEvent.setup()
    let resolvePatch: ((value: Response) => void) | undefined
    const { calls } = mockApi({
      ...AUTHED,
      'GET /orders': () => page([order({ status: 'Pending' })]),
      'PATCH /orders': () =>
        new Promise<Response>((resolve) => {
          resolvePatch = resolve
        }),
    })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    const select = screen.getByLabelText('Status for order SD-4001')
    await user.selectOptions(select, 'Shipped')

    await waitFor(() => {
      expect(select).toHaveProperty('disabled', true)
    })

    resolvePatch!(json(200, { order: order({ status: 'Shipped' }) }))

    await waitFor(() => {
      expect(select).toHaveProperty('disabled', false)
    })
    expect(calls.filter((call) => call.method === 'PATCH')).toHaveLength(1)
  })

  it('does not call the API when the status is unchanged', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /orders': () => page([order({ status: 'Pending' })]),
    })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    await user.selectOptions(screen.getByLabelText('Status for order SD-4001'), 'Pending')

    expect(calls.filter((call) => call.method === 'PATCH')).toHaveLength(0)
  })

  it('keeps each row independent while one is updating', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'GET /orders': () =>
        page([
          order({ id: 'o1', orderNo: 'SD-4001' }),
          order({ id: 'o2', orderNo: 'SD-4002' }),
        ]),
      'PATCH /orders': () => new Promise<Response>(() => {}),
    })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    await user.selectOptions(screen.getByLabelText('Status for order SD-4001'), 'Shipped')

    await waitFor(() => {
      expect(screen.getByLabelText('Status for order SD-4001')).toHaveProperty('disabled', true)
    })
    expect(screen.getByLabelText('Status for order SD-4002')).toHaveProperty('disabled', false)
  })
})

describe('table rendering', () => {
  it('keeps the status column reachable in the row', async () => {
    mockApi({ ...AUTHED, 'GET /orders': () => page([order()]) })

    renderWithProviders(<OrdersPage />)
    await screen.findByText('#SD-4001')

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Status' })).toBeDefined()
  })
})
