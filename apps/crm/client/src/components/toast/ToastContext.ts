import { createContext } from 'react'

/** Matches the two supplied alert exports: 🎉 for saved, 🔥 for deleted. */
export type ToastTone = 'saved' | 'deleted'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)
