import { render, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import { ToastProvider } from '../components/toast/ToastProvider'
import { AuthProvider } from '../features/auth/AuthProvider'
import { ThemeProvider } from '../theme/ThemeProvider'

/** Mirrors App.tsx's provider order so tests exercise the real composition. */
export function renderWithProviders(ui: ReactNode, path = '/'): RenderResult {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}
