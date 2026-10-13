import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { ToastContext, type Toast, type ToastTone } from './ToastContext'
import styles from './Toast.module.css'

const AUTO_DISMISS_MS = 4000

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'saved') => {
      const id = (nextId += 1)
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext value={value}>
      {children}

      {/* Announced politely so a success is not missed by screen readers. */}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <output key={toast.id} className={styles.toast}>
            <span className={styles.emoji} aria-hidden="true">
              {toast.tone === 'deleted' ? '🔥' : '🎉'}
            </span>
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </output>
        ))}
      </div>
    </ToastContext>
  )
}
