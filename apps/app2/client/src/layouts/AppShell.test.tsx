import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '../app/router'
import { json, mockApi } from '../__tests__/apiMock'
import { renderWithProviders } from '../__tests__/renderWithProviders'
import { stats, USER } from '../fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const AUTHED = {
  'GET /auth/me': () => json(200, { user: USER }),
  'GET /stats': () => json(200, stats()),
}

describe('app shell', () => {
  it('renders both navigations with every section', async () => {
    mockApi(AUTHED)

    renderWithProviders(<AppRoutes />, '/dashboard')
    await screen.findByRole('heading', { name: 'Overview' })

    // The rail and the mobile tab bar both render; each nav repeats the labels.
    expect(screen.getAllByRole('navigation', { name: 'Primary' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Products' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Profile' })).toHaveLength(2)
  })

  it('applies the theme attribute to the document element', async () => {
    mockApi(AUTHED)

    renderWithProviders(<AppRoutes />, '/dashboard')
    await screen.findByRole('heading', { name: 'Overview' })

    expect(document.documentElement.dataset.theme).toMatch(/^(light|dark)$/)
  })

  it('shows the signed-in user in the topbar', async () => {
    mockApi(AUTHED)

    renderWithProviders(<AppRoutes />, '/dashboard')

    expect(await screen.findByText('ShopDesk Admin')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDefined()
  })

  it('shows the placeholder for a section that is not built yet', async () => {
    mockApi(AUTHED)

    renderWithProviders(<AppRoutes />, '/customers')

    expect(await screen.findByText(/arrives in a later increment/i)).toBeDefined()
  })

  it('shows the not-found page for an unknown route', async () => {
    mockApi(AUTHED)

    renderWithProviders(<AppRoutes />, '/nope')

    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeDefined()
  })
})
