import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { OrdersPage } from '../features/orders/pages/OrdersPage'
import { ProductsPage } from '../features/products/pages/ProductsPage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { AppShell } from '../layouts/AppShell'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { NotFoundPage } from '../pages/NotFoundPage'

/**
 * Route table.
 *
 * Everything but /login nests inside ProtectedRoute, then inside AppShell, so
 * the shell mounts once and survives navigation and no authenticated page can
 * be reached without a session.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />

          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route path="/customers" element={<ComingSoonPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
