import type { ReactNode } from 'react'

import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/**
 * Centred card for login and register.
 *
 * No auth screens were supplied in the design set, so this is built from the
 * same tokens as the rest of the app, as the brief instructs.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">
          C
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
        <p className={styles.footer}>{footer}</p>
      </div>
    </div>
  )
}
