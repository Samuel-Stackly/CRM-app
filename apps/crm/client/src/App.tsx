import { BrowserRouter } from 'react-router-dom'

import { AppRoutes } from './app/router'
import { ToastProvider } from './components/toast/ToastProvider'
import { AuthProvider } from './features/auth/AuthProvider'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
