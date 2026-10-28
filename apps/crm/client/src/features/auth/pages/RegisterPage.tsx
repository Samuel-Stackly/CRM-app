import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/TextField'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { ApiError } from '../../../services/http'
import { useAuth } from '../useAuth'
import styles from './AuthForm.module.css'

export function RegisterPage() {
  const { status, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
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
      await register({ name, email, password })
      await navigate('/dashboard', { replace: true })
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
      title="Create your account"
      subtitle="Start tracking customers, deals and tasks."
      footer={<>Already registered? <Link to="/login">Sign in</Link></>}
    >
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
        {error ? (
          <p className={styles.alert} role="alert">
            <Icon name="alert" size={18} />
            {error}
          </p>
        ) : null}

        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors['name']}
          required
        />

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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors['password']}
          required
        />

        <Button type="submit" fullWidth disabled={submitting} className={styles.submit}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
