// src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { memo } from 'react'
import { PageLoader } from './components/PageLoader'
import { useAuth } from './features/auth/useAuth'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'

/**
 * مكون إعادة التوجيه بناءً على حالة الجلسة
 * - إذا كان التحميل جارياً: عرض شاشة التحميل
 * - إذا كان المستخدم مسجلاً: توجيه إلى /account
 * - وإلا: توجيه إلى /login
 */
const HomeRedirect = memo(function HomeRedirect() {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader label="جاري التحقق من الجلسة..." />
  return <Navigate to={session ? '/account' : '/login'} replace />
})

/**
 * المكون الرئيسي للتطبيق
 * يستخدم HashRouter (من main.tsx) لتوفير التوجيه داخل التطبيق
 * جميع المسارات متوافقة مع HashRouter ولا تحتاج إلى تعديل إضافي
 */
export function App() {
  return (
    <Routes>
      {/* الصفحة الرئيسية: إعادة توجيه تلقائي */}
      <Route path="/" element={<HomeRedirect />} />

      {/* صفحة تسجيل الدخول */}
      <Route path="/login" element={<LoginPage />} />

      {/* المسارات المحمية: تتطلب جلسة نشطة */}
      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<AccountPage />} />
      </Route>

      {/* صفحة 404 لكل المسارات غير المعروفة */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
