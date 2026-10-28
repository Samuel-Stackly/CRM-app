import { createContext } from 'react'

export type ToastTone = 'success' | 'error'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

export interface ToastValue {
  /** Shows a transient confirmation. */
  success: (message: string) => void
  /** Shows a transient failure. Stays longer — it usually needs reading. */
  error: (message: string) => void
}

export const ToastContext = createContext<ToastValue | undefined>(undefined)
