import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/TextField'
import { ApiError } from '../../../services/http'
import { useAuth } from '../useAuth'

interface FieldErrors {
  email?: string
  password?: string
}

/** Mirrors the server's rule without duplicating its wording. */
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (!password) errors.password = 'Password is required'

  return errors
}

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  // Already signed in — go where they were headed, or to the dashboard.
  if (status === 'authenticated') {
    const from = (location.state as { from?: { pathname: string } } | null)?.from
    return <Navigate to={from?.pathname ?? '/dashboard'} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    const errors = validate(email, password)
    setFieldErrors(errors)
    setFormError(undefined)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      const from = (location.state as { from?: { pathname: string } } | null)?.from
      navigate(from?.pathname ?? '/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        // A 400 carries per-field detail; a 401 is a single message about the
        // pair, so attaching it to one field would point at the wrong thing.
        const fields = error.fieldErrors
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields)
        } else {
          setFormError(error.message)
        }
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight">ShopDesk</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Use your store administrator account.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            placeholder="admin@shopdesk.dev"
          />

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />

          {formError && (
            <p role="alert" className="text-sm text-accent-red">
              {formError}
            </p>
          )}

          <Button type="submit" variant="primary" loading={submitting} className="mt-1 w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  )
}
