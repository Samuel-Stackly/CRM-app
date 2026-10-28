import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '../../app/router'
import { json, mockApi, UNAUTHORIZED } from '../../__tests__/apiMock'
import { renderWithProviders } from '../../__tests__/renderWithProviders'
import { stats, USER } from '../../fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('protected routes', () => {
  it('redirects an unauthenticated visitor to the login page', async () => {
    mockApi({ 'GET /auth/me': UNAUTHORIZED })

    renderWithProviders(<AppRoutes />, '/dashboard')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeDefined()
  })

  it('shows a restoring state before the session resolves', () => {
    mockApi({ 'GET /auth/me': () => new Promise<Response>(() => {}) })

    renderWithProviders(<AppRoutes />, '/dashboard')

    expect(screen.getByText(/restoring your session/i)).toBeDefined()
    // Neither the login form nor the dashboard has rendered yet.
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull()
  })

  it('renders the dashboard for an authenticated visitor', async () => {
    mockApi({
      'GET /auth/me': () => json(200, { user: USER }),
      'GET /stats': () => json(200, stats()),
    })

    renderWithProviders(<AppRoutes />, '/dashboard')

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeDefined()
  })
})

describe('login', () => {
  it('validates the email format before calling the API', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({ 'GET /auth/me': UNAUTHORIZED })

    renderWithProviders(<AppRoutes />, '/login')
    await screen.findByRole('heading', { name: 'Sign in' })

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'Admin@123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeDefined()
    expect(calls.some((call) => call.url.includes('/auth/login'))).toBe(false)
  })

  it('requires both fields', async () => {
    const user = userEvent.setup()
    mockApi({ 'GET /auth/me': UNAUTHORIZED })

    renderWithProviders(<AppRoutes />, '/login')
    await screen.findByRole('heading', { name: 'Sign in' })

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is required')).toBeDefined()
    expect(screen.getByText('Password is required')).toBeDefined()
  })

  it('shows the server message for invalid credentials', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /auth/me': UNAUTHORIZED,
      'POST /auth/login': () => json(401, { error: { message: 'Invalid email or password' } }),
    })

    renderWithProviders(<AppRoutes />, '/login')
    await screen.findByRole('heading', { name: 'Sign in' })

    await user.type(screen.getByLabelText('Email'), 'admin@shopdesk.dev')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Invalid email or password',
    )
  })

  it('reports a network failure without leaving the form stuck', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /auth/me': UNAUTHORIZED,
      'POST /auth/login': () => {
        throw new TypeError('Failed to fetch')
      },
    })

    renderWithProviders(<AppRoutes />, '/login')
    await screen.findByRole('heading', { name: 'Sign in' })

    await user.type(screen.getByLabelText('Email'), 'admin@shopdesk.dev')
    await user.type(screen.getByLabelText('Password'), 'Admin@123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveProperty('disabled', false)
  })

  it('signs in and lands on the dashboard', async () => {
    const user = userEvent.setup()
    let signedIn = false
    mockApi({
      'GET /auth/me': () => (signedIn ? json(200, { user: USER }) : UNAUTHORIZED()),
      'POST /auth/login': () => {
        signedIn = true
        return json(200, { user: USER })
      },
      'GET /stats': () => json(200, stats()),
    })

    renderWithProviders(<AppRoutes />, '/login')
    await screen.findByRole('heading', { name: 'Sign in' })

    await user.type(screen.getByLabelText('Email'), 'admin@shopdesk.dev')
    await user.type(screen.getByLabelText('Password'), 'Admin@123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeDefined()
  })

  it('signs out back to the login page', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /auth/me': () => json(200, { user: USER }),
      'GET /stats': () => json(200, stats()),
      'POST /auth/logout': () => json(204, null),
    })

    renderWithProviders(<AppRoutes />, '/dashboard')
    await screen.findByRole('heading', { name: 'Overview' })

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeDefined()
    })
  })

  it('clears the session and returns to login when a request 401s', async () => {
    mockApi({
      'GET /auth/me': () => json(200, { user: USER }),
      // The token expired between restore and the first data call.
      'GET /stats': UNAUTHORIZED,
    })

    renderWithProviders(<AppRoutes />, '/dashboard')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeDefined()
  })
})
