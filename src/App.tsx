import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from './components/PageLoader'
import { useAuth } from './features/auth/useAuth'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'

function HomeRedirect() {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader label="جاري التحقق من الجلسة..." />
  return <Navigate to={session ? '/account' : '/login'} replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
