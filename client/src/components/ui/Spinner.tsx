import styles from './Spinner.module.css'

/** Loading indicator. The design supplies none, so this is built from tokens. */
export function Spinner({ fullPage = false, label = 'Loading' }: {
  fullPage?: boolean
  label?: string
}) {
  return (
    <div className={`${styles.wrapper} ${fullPage ? styles.fullPage : ''}`} role="status">
      <div className={styles.spinner} />
      <span className="srOnly">{label}</span>
    </div>
  )
}
