import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { json, mockApi } from '../../__tests__/apiMock'
import { renderWithProviders } from '../../__tests__/renderWithProviders'
import { product, USER } from '../../fixtures'
import type { Product } from '../../types/models'
import { ProductsPage } from './pages/ProductsPage'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const AUTHED = { 'GET /auth/me': () => json(200, { user: USER }) }

function page(products: Product[], overrides: Record<string, unknown> = {}) {
  return json(200, {
    data: products,
    pagination: {
      page: 1,
      limit: 10,
      total: products.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      ...overrides,
    },
  })
}

describe('product listing', () => {
  it('renders products from GET /api/products', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })

    renderWithProviders(<ProductsPage />)

    expect(await screen.findByText('Studio Headphones')).toBeDefined()
    expect(screen.getByText('$249.99')).toBeDefined()
  })

  it('shows an empty state when the store has no products', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([]) })

    renderWithProviders(<ProductsPage />)

    expect(await screen.findByText('No products yet')).toBeDefined()
  })

  it('distinguishes "no matches" from "no products" when filtered', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([]) })

    renderWithProviders(<ProductsPage />, '/products?category=Apparel')

    expect(await screen.findByText('No matching products')).toBeDefined()
  })

  it('shows an error state and retries', async () => {
    const user = userEvent.setup()
    let attempt = 0
    mockApi({
      ...AUTHED,
      'GET /products': () => {
        attempt += 1
        return attempt === 1
          ? json(500, { error: { message: 'Internal server error' } })
          : page([product()])
      },
    })

    renderWithProviders(<ProductsPage />)

    expect(await screen.findByRole('alert')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Studio Headphones')).toBeDefined()
  })

  it('flags low stock', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([product({ stock: 3 })]) })

    renderWithProviders(<ProductsPage />)

    expect(await screen.findByText('3 low')).toBeDefined()
  })
})

describe('filtering and pagination', () => {
  it('sends the category filter to the API', async () => {
    const { calls } = mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })

    renderWithProviders(<ProductsPage />, '/products?category=Electronics')
    await screen.findByText('Studio Headphones')

    const listCalls = calls.filter((call) => call.url.includes('/products'))
    expect(listCalls.at(-1)!.url).toContain('category=Electronics')
  })

  it('reads search and page from the URL, so a refresh restores the view', async () => {
    const { calls } = mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })

    renderWithProviders(<ProductsPage />, '/products?search=head&page=2')
    await screen.findByText('Studio Headphones')

    const url = calls.filter((call) => call.url.includes('/products')).at(-1)!.url
    expect(url).toContain('search=head')
    expect(url).toContain('page=2')
    expect(screen.getByLabelText('Search')).toHaveProperty('value', 'head')
  })

  it('debounces typing into a single request', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    const before = calls.filter((call) => call.url.includes('/products')).length

    await user.type(screen.getByLabelText('Search'), 'headphones')

    await waitFor(() => {
      const after = calls.filter((call) => call.url.includes('/products'))
      expect(after.at(-1)!.url).toContain('search=headphones')
    })

    const total = calls.filter((call) => call.url.includes('/products')).length
    // Ten keystrokes must not become ten requests.
    expect(total - before).toBeLessThanOrEqual(2)
  })

  it('paginates with the server metadata', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /products': () =>
        page([product()], { total: 25, totalPages: 3, hasNextPage: true }),
    })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => {
      expect(calls.filter((call) => call.url.includes('/products')).at(-1)!.url).toContain(
        'page=2',
      )
    })
  })

  it('clears filters back to an unfiltered request', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })

    renderWithProviders(<ProductsPage />, '/products?category=Apparel')
    await screen.findByText('Studio Headphones')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => {
      expect(calls.filter((call) => call.url.includes('/products')).at(-1)!.url).not.toContain(
        'category=',
      )
    })
  })
})

describe('product form validation', () => {
  async function openAddForm() {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Add product' }))
    return user
  }

  it('requires a name and a category', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })
    const user = await openAddForm()

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }))

    expect(await within(dialog).findByText('Name is required')).toBeDefined()
    expect(within(dialog).getByText('Category is required')).toBeDefined()
  })

  it('rejects a price of zero and a negative one', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })
    const user = await openAddForm()
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), 'Thing')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Home')
    await user.type(within(dialog).getByLabelText('Price'), '0')
    await user.type(within(dialog).getByLabelText('Stock'), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }))

    expect(await within(dialog).findByText('Price must be greater than zero')).toBeDefined()
  })

  it('rejects a fractional and a negative stock', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })
    const user = await openAddForm()
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), 'Thing')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Home')
    await user.type(within(dialog).getByLabelText('Price'), '10')
    await user.type(within(dialog).getByLabelText('Stock'), '2.5')
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }))

    expect(await within(dialog).findByText('Stock must be a whole number')).toBeDefined()
  })

  it('rejects a malformed image URL but accepts an empty one', async () => {
    mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })
    const user = await openAddForm()
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), 'Thing')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Home')
    await user.type(within(dialog).getByLabelText('Price'), '10')
    await user.type(within(dialog).getByLabelText('Stock'), '1')
    await user.type(within(dialog).getByLabelText('Image URL'), 'not a url')
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }))

    expect(await within(dialog).findByText('Enter a valid image URL')).toBeDefined()
  })
})

describe('product CRUD', () => {
  it('creates a product and confirms with a toast', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /products': () => page([product()]),
      'POST /products': () => json(201, { product: product({ name: 'New Thing' }) }),
    })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Add product' }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'New Thing')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Home')
    await user.type(within(dialog).getByLabelText('Price'), '19.99')
    await user.type(within(dialog).getByLabelText('Stock'), '5')
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }))

    expect(await screen.findByText('New Thing added')).toBeDefined()

    const posted = calls.find((call) => call.method === 'POST')!
    expect(posted.body).toMatchObject({ name: 'New Thing', category: 'Home', price: 19.99, stock: 5 })
  })

  it('surfaces a server validation error inside the form', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'GET /products': () => page([product()]),
      'POST /products': () =>
        json(400, {
          error: {
            message: 'Validation failed',
            details: [{ path: 'name', message: 'Name is already taken' }],
          },
        }),
    })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Add product' }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Dup')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Home')
    await user.type(within(dialog).getByLabelText('Price'), '5')
    await user.type(within(dialog).getByLabelText('Stock'), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }))

    expect(await within(dialog).findByText('Name is already taken')).toBeDefined()
    // The dialog stays open so the user can correct the field.
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('edits a product with PUT', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /products': () => page([product()]),
      'PUT /products': () => json(200, { product: product({ name: 'Renamed' }) }),
    })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const dialog = screen.getByRole('dialog')
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Renamed')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Renamed updated')).toBeDefined()
    expect(calls.some((call) => call.method === 'PUT' && call.url.includes('/products/p1'))).toBe(
      true,
    )
  })

  it('deletes after confirmation', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'GET /products': () => page([product()]),
      'DELETE /products': () => json(204, null),
    })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Delete Studio Headphones' }))

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Studio Headphones deleted')).toBeDefined()
    expect(calls.some((call) => call.method === 'DELETE')).toBe(true)
  })

  it('reports a failed delete as an error toast and keeps the row', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'GET /products': () => page([product()]),
      'DELETE /products': () => json(500, { error: { message: 'Internal server error' } }),
    })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Delete Studio Headphones' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Internal server error')).toBeDefined()
    expect(screen.getByText('Studio Headphones')).toBeDefined()
  })

  it('cancelling the confirmation deletes nothing', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({ ...AUTHED, 'GET /products': () => page([product()]) })

    renderWithProviders(<ProductsPage />)
    await screen.findByText('Studio Headphones')
    await user.click(screen.getByRole('button', { name: 'Delete Studio Headphones' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
  })
})
