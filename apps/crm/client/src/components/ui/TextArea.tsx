import { useId, type TextareaHTMLAttributes } from 'react'

import styles from './TextArea.module.css'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function TextArea({ label, error, id, ...props }: TextAreaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className={`${styles.textarea} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
