import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.full : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
