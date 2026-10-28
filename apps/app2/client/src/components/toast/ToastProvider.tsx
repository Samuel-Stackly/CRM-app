import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { Icon } from '../ui/Icon'
import { ToastContext, type Toast, type ToastTone } from './ToastContext'

const DURATION: Record<ToastTone, number> = {
  success: 3_500,
  // Failures stay longer: they usually carry a message worth reading.
  error: 6_000,
}

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'text-accent-green',
  error: 'text-accent-red',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, tone, message }])

      const timer = setTimeout(() => {
        timers.current.delete(timer)
        dismiss(id)
      }, DURATION[tone])
      timers.current.add(timer)
    },
    [dismiss],
  )

  // A pending timer would fire after unmount and set state on a dead tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  )

  return (
    <ToastContext value={value}>
      {children}

      {/* aria-live so a screen reader announces the outcome of an action that
          produced no visible focus change. */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-control bg-surface px-4 py-3 text-sm shadow-lg ring-1 ring-line"
          >
            <Icon
              name={toast.tone === 'success' ? 'check' : 'alert'}
              className={`mt-0.5 size-4 shrink-0 ${TONE_CLASS[toast.tone]}`}
            />
            <p className="min-w-0 flex-1 break-words">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-ink-muted hover:text-ink"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
