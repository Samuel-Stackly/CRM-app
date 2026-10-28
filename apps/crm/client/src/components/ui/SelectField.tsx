import { useId, type SelectHTMLAttributes } from 'react'

import styles from './SelectField.module.css'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Option[]
  error?: string
}

export function SelectField({ label, options, error, id, ...props }: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={`${styles.select} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
