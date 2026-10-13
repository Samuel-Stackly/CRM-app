import { Link } from 'react-router-dom'

import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <section className={styles.panel}>
      <h2>Page not found</h2>
      <p className={styles.text}>That page does not exist or has moved.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </section>
  )
}
