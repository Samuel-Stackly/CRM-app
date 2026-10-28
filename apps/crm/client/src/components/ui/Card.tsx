import type { ReactNode } from 'react'

import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  padded?: boolean
  className?: string
}

/** White surface, 16px radius, soft shadow — the design's recurring container. */
export function Card({ children, padded = true, className }: CardProps) {
  return (
    <section className={[styles.card, padded ? styles.padded : '', className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
}

/** Card heading with the optional trailing link the design pairs it with. */
export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  )
}
