import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  size?: number
}

/** Falls back to initials; the design shows a plain circle when there is no image. */
export function Avatar({ name, size = 46 }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
