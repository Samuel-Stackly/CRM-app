import { BrowserRouter } from 'react-router-dom'

import { ToastProvider } from './components/toast/ToastProvider'
import { AppRoutes } from './app/router'
import { AuthProvider } from './features/auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Auth sits inside the router because ProtectedRoute redirects, and
            toasts sit inside auth so a session-expiry message can be shown. */}
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
