import { use } from 'react'

import { ToastContext, type ToastContextValue } from './ToastContext'

export function useToast(): ToastContextValue {
  const context = use(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
