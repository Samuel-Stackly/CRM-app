import { useState, type FormEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { TextField } from '../../../components/ui/TextField'
import { useToast } from '../../../components/toast/useToast'
import { ApiError } from '../../../services/http'
import { useAuth } from '../../auth/useAuth'
import { profileApi } from '../api'

/** Mirrors the server's rule; the server remains the enforcement point. */
const MIN_PASSWORD_LENGTH = 8

type Errors = Partial<Record<'name' | 'currentPassword' | 'password' | 'confirmPassword', string>>

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-14 rounded-full bg-fill object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="grid size-14 place-items-center rounded-full bg-fill text-lg font-medium text-ink-muted"
    >
      {name.charAt(0)}
    </span>
  )
}

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const toast = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)

  // On a cold load of /profile the session is still being restored, so `user`
  // is null for the first render and the initial useState value is ''. Seeding
  // the field during render once the user arrives is what stops the name box
  // showing up empty after a refresh. Keyed on the id so it re-seeds for a
  // different account but never clobbers what the user is typing.
  const [seededFor, setSeededFor] = useState<string>()
  if (user && seededFor !== user.id) {
    setSeededFor(user.id)
    setName(user.name)
  }

  // The authenticated layout cannot render without a user, so this is a guard
  // against the restoring frame rather than a state the screen settles in.
  if (!user) return null

  const nameChanged = name.trim() !== user.name
  // Touching any password field counts as wanting a change, so a filled
  // current-password box alone still surfaces the new-password rules rather
  // than silently saving nothing.
  const wantsNewPassword =
    password.length > 0 || confirmPassword.length > 0 || currentPassword.length > 0
  const hasChanges = nameChanged || wantsNewPassword

  function validate(): Errors {
    const found: Errors = {}

    if (!name.trim()) found.name = 'Name is required'

    if (wantsNewPassword) {
      // Required by the server, which re-authenticates the change against the
      // stored hash; checking here saves a round trip on an obvious omission.
      if (!currentPassword) {
        found.currentPassword = 'Enter your current password to set a new one'
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        found.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      }
      // Confirmation is a client-side guard against a typo in a field whose
      // contents are masked; the server neither needs nor receives it.
      if (confirmPassword !== password) {
        found.confirmPassword = 'Passwords do not match'
      }
    }

    return found
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    const found = validate()
    setErrors(found)
    setFormError(undefined)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const response = await profileApi.update({
        // Only what actually changed: sending an unchanged name would still be
        // a write, and sending an empty body is rejected.
        ...(nameChanged ? { name: name.trim() } : {}),
        // Password fields are omitted entirely for a name-only save, so the
        // server never requires a current password it does not need.
        ...(wantsNewPassword ? { password, currentPassword } : {}),
      })

      // Keeps the topbar and everything else reading `user` in step without a
      // refetch.
      setUser(response.user)
      setName(response.user.name)
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      toast.success(wantsNewPassword ? 'Profile and password updated' : 'Profile updated')
    } catch (caught) {
      // The form keeps whatever was typed: a failed save must not cost the
      // user their input.
      if (caught instanceof ApiError) {
        const fields = caught.fieldErrors
        if (Object.keys(fields).length > 0) setErrors(fields as Errors)
        else setFormError(caught.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>

      <Card className="max-w-xl">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} url={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{user.name}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
        </div>
      </Card>

      <Card title="Account details" accent="accent" className="max-w-xl">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            autoComplete="name"
          />

          {/* Email is shown for reference; the API has no endpoint to change
              it, so presenting it as editable would be a lie. */}
          <TextField
            label="Email"
            value={user.email}
            readOnly
            disabled
            hint="Email cannot be changed"
          />

          <hr className="border-line" />

          <div>
            <h3 className="text-sm font-medium">Change password</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Leave these fields blank to keep your current password.
            </p>
          </div>

          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            error={errors.currentPassword}
          />

          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />

          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={errors.confirmPassword}
          />

          {formError && (
            <p role="alert" className="text-sm text-accent-red">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving} disabled={!hasChanges}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
