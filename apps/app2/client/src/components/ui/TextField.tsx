import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  /** Server-side or client-side message; its presence marks the field invalid. */
  error?: string
  hint?: string
  /** Rendered inside the control, before the input — a search glyph, say. */
  leading?: ReactNode
}

export function TextField({
  label,
  error,
  hint,
  leading,
  className = '',
  ...props
}: TextFieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>

      <div
        className={[
          'flex h-9 items-center gap-2 rounded-control bg-fill px-3',
          'focus-within:outline-2 focus-within:outline-offset-2',
          error ? 'focus-within:outline-accent-red' : 'focus-within:outline-accent',
        ].join(' ')}
      >
        {leading && <span className="shrink-0 text-ink-muted">{leading}</span>}
        <input
          id={id}
          // Describes the field by its error when there is one, so a screen
          // reader announces the reason rather than only the invalid state.
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          {...props}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-accent-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
