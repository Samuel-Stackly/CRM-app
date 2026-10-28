import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '../../app/router'
import { json, mockApi } from '../../__tests__/apiMock'
import { renderWithProviders } from '../../__tests__/renderWithProviders'
import { USER } from '../../fixtures'
import { ProfilePage } from './pages/ProfilePage'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const AUTHED = { 'GET /auth/me': () => json(200, { user: USER }) }

describe('profile loading', () => {
  it('shows the signed-in user from the auth provider', async () => {
    mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)

    expect(await screen.findByDisplayValue('ShopDesk Admin')).toBeDefined()
    expect(screen.getAllByText('admin@shopdesk.dev').length).toBeGreaterThan(0)
  })

  it('does not request the profile separately — it reuses the session', async () => {
    const { calls } = mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    expect(calls.filter((call) => call.url.includes('/users/me'))).toHaveLength(0)
  })

  it('presents email as read-only, since the API cannot change it', async () => {
    mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)

    const email = await screen.findByLabelText('Email')
    expect(email).toHaveProperty('disabled', true)
  })

  it('falls back to an initial when there is no avatar', async () => {
    mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders the avatar when the user has one', async () => {
    mockApi({
      'GET /auth/me': () =>
        json(200, { user: { ...USER, avatarUrl: 'https://example.com/a.png' } }),
    })

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('presentation', { hidden: true })).toBeDefined()
    })
  })
})

describe('name updates', () => {
  it('saves only the changed name and syncs the auth provider', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'PUT /users/me': () => json(200, { user: { ...USER, name: 'Renamed Admin' } }),
      'GET /stats': () => json(200, { totalProducts: 0, totalOrders: 0, revenue: 0, lowStockCount: 0 }),
    })

    renderWithProviders(<AppRoutes />, '/profile')
    const field = await screen.findByLabelText('Name')

    await user.clear(field)
    await user.type(field, 'Renamed Admin')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile updated')).toBeDefined()

    const put = calls.find((call) => call.method === 'PUT')!
    // No password fields at all on a name-only save, so the server never asks
    // for a current password it does not need.
    expect(put.body).toEqual({ name: 'Renamed Admin' })

    // The topbar reads `user` from the provider, so it must show the new name.
    await waitFor(() => {
      expect(screen.getAllByText('Renamed Admin').length).toBeGreaterThan(0)
    })
  })

  it('disables save until something changes', async () => {
    mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('rejects an empty name', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    const field = await screen.findByLabelText('Name')

    await user.clear(field)
    await user.type(field, '  ')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Name is required')).toBeDefined()
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
  })
})

describe('password updates', () => {
  /** Fills the three password boxes. */
  async function fillPasswords(
    user: ReturnType<typeof userEvent.setup>,
    current: string,
    next: string,
    confirm = next,
  ) {
    if (current) await user.type(screen.getByLabelText('Current password'), current)
    if (next) await user.type(screen.getByLabelText('New password'), next)
    if (confirm) await user.type(screen.getByLabelText('Confirm new password'), confirm)
  }

  it('sends the current and new passwords, and clears every field on success', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      ...AUTHED,
      'PUT /users/me': () => json(200, { user: USER }),
    })

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, 'Admin@123', 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile and password updated')).toBeDefined()
    expect(calls.find((call) => call.method === 'PUT')!.body).toEqual({
      password: 'BrandNewPass1',
      currentPassword: 'Admin@123',
    })
    expect(screen.getByLabelText('Current password')).toHaveProperty('value', '')
    expect(screen.getByLabelText('New password')).toHaveProperty('value', '')
    expect(screen.getByLabelText('Confirm new password')).toHaveProperty('value', '')
  })

  it('requires the current password before calling the API', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, '', 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Enter your current password to set a new one'),
    ).toBeDefined()
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
  })

  it('shows the server message when the current password is wrong', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () =>
        json(401, { error: { message: 'Current password is incorrect' } }),
    })

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, 'wrong-password', 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Current password is incorrect',
    )
  })

  it('surfaces a server currentPassword field error inline', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () =>
        json(400, {
          error: {
            message: 'Validation failed',
            details: [
              {
                path: 'currentPassword',
                message: 'Current password is required to set a new one',
              },
            ],
          },
        }),
    })

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, 'something', 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Current password is required to set a new one'),
    ).toBeDefined()
  })

  it('rejects a password shorter than eight characters', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, 'Admin@123', 'short')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeDefined()
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
  })

  it('rejects a mismatched confirmation', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi(AUTHED)

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, 'Admin@123', 'BrandNewPass1', 'BrandNewPass2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Passwords do not match')).toBeDefined()
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
  })

  it('keeps the typed passwords when the save fails', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () =>
        json(401, { error: { message: 'Current password is incorrect' } }),
    })

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await fillPasswords(user, 'wrong-password', 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('alert')
    expect(screen.getByLabelText('Current password')).toHaveProperty(
      'value',
      'wrong-password',
    )
    expect(screen.getByLabelText('New password')).toHaveProperty('value', 'BrandNewPass1')
  })

  it('never puts a password hash on screen', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      // Even if the server regressed and leaked one, the screen renders only
      // the fields it knows about.
      'PUT /users/me': () =>
        json(200, { user: { ...USER, passwordHash: '$2b$12$leaked' } }),
    })

    renderWithProviders(<ProfilePage />)
    await screen.findByDisplayValue('ShopDesk Admin')

    await user.type(screen.getByLabelText('Current password'), 'Admin@123')
    await user.type(screen.getByLabelText('New password'), 'BrandNewPass1')
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Profile and password updated')
    expect(document.body.textContent).not.toContain('$2b$12$leaked')
  })
})

describe('API failures', () => {
  it('keeps the typed input when the save fails', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () => json(500, { error: { message: 'Internal server error' } }),
    })

    renderWithProviders(<ProfilePage />)
    const field = await screen.findByLabelText('Name')

    await user.clear(field)
    await user.type(field, 'Attempted Name')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Internal server error',
    )
    // The user's work survives the failure.
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Attempted Name')
  })

  it('surfaces a server field error on the matching input', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () =>
        json(400, {
          error: {
            message: 'Validation failed',
            details: [{ path: 'name', message: 'Name must be at most 120 characters' }],
          },
        }),
    })

    renderWithProviders(<ProfilePage />)
    const field = await screen.findByLabelText('Name')

    await user.clear(field)
    await user.type(field, 'Something long')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Name must be at most 120 characters')).toBeDefined()
  })

  it('reports a network failure without losing input', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () => {
        throw new TypeError('Failed to fetch')
      },
    })

    renderWithProviders(<ProfilePage />)
    const field = await screen.findByLabelText('Name')

    await user.clear(field)
    await user.type(field, 'Offline Name')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Offline Name')
  })
})

describe('session safety', () => {
  it('a wrong current password does not sign the user out', async () => {
    const user = userEvent.setup()
    mockApi({
      ...AUTHED,
      'PUT /users/me': () =>
        json(401, { error: { message: 'Current password is incorrect' } }),
    })

    renderWithProviders(<AppRoutes />, '/profile')
    await screen.findByDisplayValue('ShopDesk Admin')

    await user.type(screen.getByLabelText('Current password'), 'wrong-password')
    await user.type(screen.getByLabelText('New password'), 'BrandNewPass1')
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNewPass1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toBeDefined()
    // Still on the profile screen, not bounced to login: this 401 means "wrong
    // password", not "session over".
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull()
    expect(screen.getByLabelText('Name')).toBeDefined()
  })
})
