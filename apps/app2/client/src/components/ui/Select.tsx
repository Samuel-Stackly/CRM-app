import { useId, type SelectHTMLAttributes } from 'react'

import { Icon } from './Icon'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> {
  label: string
  options: SelectOption[]
  error?: string
  /** Shown as a disabled first entry when the value is empty. */
  placeholder?: string
  /** Hides the label visually but keeps it for assistive technology. */
  hideLabel?: boolean
}

export function Select({
  label,
  options,
  error,
  placeholder,
  hideLabel = false,
  className = '',
  ...props
}: SelectProps) {
  const id = useId()

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'text-xs font-medium text-ink-muted'}
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={[
            'h-9 w-full appearance-none rounded-control bg-fill pl-3 pr-8 text-sm text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            error ? 'focus-visible:outline-accent-red' : 'focus-visible:outline-accent',
          ].join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* The native arrow is hidden by appearance-none; this replaces it. */}
        <Icon
          name="chevronDown"
          className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        />
      </div>

      {error && (
        <p id={`${id}-error`} className="text-xs text-accent-red">
          {error}
        </p>
      )}
    </div>
  )
}
