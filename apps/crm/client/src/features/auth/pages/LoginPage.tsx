import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/TextField'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { ApiError } from '../../../services/http'
import { useAuth } from '../useAuth'
import styles from './AuthForm.module.css'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      await login({ email, password })
      // Return to wherever the guard interrupted, or the dashboard.
      const from = (location.state as { from?: string } | null)?.from
      await navigate(from ?? '/dashboard', { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors)
        setError(caught.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Mini CRM account."
      footer={<>No account yet? <Link to="/register">Create one</Link></>}
    >
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
        {error ? (
          <p className={styles.alert} role="alert">
            <Icon name="alert" size={18} />
            {error}
          </p>
        ) : null}

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors['email']}
          required
        />

        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors['password']}
          required
        />

        <Button type="submit" fullWidth disabled={submitting} className={styles.submit}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
