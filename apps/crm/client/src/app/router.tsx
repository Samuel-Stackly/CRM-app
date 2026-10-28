import { Navigate, Route, Routes } from 'react-router-dom'

import { CustomerDetailPage } from '../features/customers/pages/CustomerDetailPage'
import { CustomersPage } from '../features/customers/pages/CustomersPage'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { DealDetailPage } from '../features/deals/pages/DealDetailPage'
import { DealsPage } from '../features/deals/pages/DealsPage'
import { TasksPage } from '../features/tasks/pages/TasksPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { AppLayout } from '../layouts/AppLayout'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { NotFoundPage } from '../pages/NotFoundPage'

/**
 * Route table.
 *
 * Protected routes nest inside AppLayout via a layout route, so the shell
 * mounts once and survives navigation between pages.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />

          <Route path="/deals" element={<DealsPage />} />
          <Route path="/deals/:id" element={<DealDetailPage />} />

          <Route path="/tasks" element={<TasksPage />} />

          <Route path="/coming-soon" element={<ComingSoonPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
