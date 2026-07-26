import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '../components/PageLoader'
import { useAuth } from '../features/auth/useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader label="جاري التحقق من حسابك..." />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
