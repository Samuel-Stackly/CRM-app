import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Guard for destructive actions.
 *
 * The design supplies a trash control and an after-the-fact "deleted" toast but
 * no confirmation step, so this is our own addition built from the same tokens.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>{message}</p>
    </Modal>
  )
}
