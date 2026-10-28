import { useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import styles from './ComingSoonPage.module.css'

/**
 * Destination for the three rail items that have no screen in the design set
 * (calendar, notifications, settings). Mirrors the supplied Coming Soon modal.
 */
export function ComingSoonPage() {
  const navigate = useNavigate()

  return (
    <section className={styles.panel}>
      <div className={styles.emoji} aria-hidden="true">
        👍
      </div>
      <p className={styles.eyebrow}>Demo version only</p>
      <h2 className={styles.title}>Sorry.</h2>
      <p className={styles.body}>
        This is an example demo only — not all screens or features are implemented.
      </p>
      <Button fullWidth className={styles.action} onClick={() => void navigate(-1)}>
        Close
      </Button>
    </section>
  )
}
