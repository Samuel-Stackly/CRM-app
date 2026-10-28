import { useEffect, useRef, type ReactNode } from 'react'

import { Icon } from './Icon'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
}

/**
 * Centred dialog.
 *
 * Built on the existing tokens rather than a dialog library: the app needs one
 * dialog shape, and the behaviour worth having — Escape to close, no scrolling
 * behind it, focus moved inside — is a dozen lines.
 */
export function Modal({ title, onClose, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    // The page behind must not scroll while the dialog is open, or a phone
    // scrolls the list instead of the form.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  // Move focus into the dialog so keyboard users are not left behind it.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        // Only a press that starts on the backdrop dismisses, so a drag that
        // ends outside the dialog does not close it.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-card bg-surface shadow-2xl outline-none sm:rounded-card ${SIZE[size]}`}
      >
        <header className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-fill hover:text-ink"
          >
            <Icon name="close" className="size-4" />
          </button>
        </header>

        <div className="px-5 pb-5">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
