import { Avatar } from '../components/ui/Avatar'
import { Icon } from '../components/icons/Icon'
import { useAuth } from '../features/auth/useAuth'
import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth()

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        {/* Search opens in a later phase; the design shows the control only. */}
        <button type="button" className={styles.iconButton} title="Search" disabled>
          <Icon name="search" />
          <span className="srOnly">Search</span>
        </button>

        <Avatar name={user?.name ?? '?'} />

        <button
          type="button"
          className={styles.iconButton}
          onClick={() => void logout()}
          title="Log out"
        >
          <Icon name="logout" />
          <span className="srOnly">Log out</span>
        </button>
      </div>
    </header>
  )
}
