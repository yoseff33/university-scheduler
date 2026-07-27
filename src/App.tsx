// src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { memo } from 'react'
import { PageLoader } from './components/PageLoader'
import { useAuth } from './features/auth/useAuth'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { HomePage } from './pages/HomePage'
import { MenuPage } from './pages/MenuPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { LoyaltyPage } from './pages/LoyaltyPage'
import { CarManagementPage } from './pages/CarManagementPage'
import { CardDesignerPage } from './pages/CardDesignerPage'
import { CashierPage } from './pages/CashierPage'
import { AdminPage } from './pages/AdminPage'

/**
 * مكون إعادة التوجيه الرئيسي:
 * - أثناء التحميل: عرض شاشة التحميل
 * - إذا كان المستخدم مسجلاً: التوجيه إلى الصفحة الرئيسية (/home)
 * - وإلا: التوجيه إلى صفحة تسجيل الدخول (/login)
 */
const HomeRedirect = memo(function HomeRedirect() {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader label="جاري التحقق من الجلسة..." />
  return <Navigate to={session ? '/home' : '/login'} replace />
})

/**
 * المكون الرئيسي للتطبيق
 * يستخدم HashRouter (من main.tsx) لتوفير التوجيه الداخلي
 * جميع المسارات مضمنة ومحمية حسب الحاجة
 */
export function App() {
  return (
    <Routes>
      {/* الصفحة الرئيسية: إعادة توجيه تلقائي */}
      <Route path="/" element={<HomeRedirect />} />

      {/* صفحة تسجيل الدخول (عامة) */}
      <Route path="/login" element={<LoginPage />} />

      {/* المسارات المحمية (تتطلب جلسة نشطة) */}
      <Route element={<ProtectedRoute />}>
        {/* الصفحة الرئيسية بعد الدخول */}
        <Route path="/home" element={<HomePage />} />

        {/* صفحة الحساب الشخصي */}
        <Route path="/account" element={<AccountPage />} />

        {/* المنيو والمنتجات */}
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/menu/:categoryId" element={<MenuPage />} />
        <Route path="/product/:productId" element={<ProductDetailPage />} />

        {/* السلة وإتمام الطلب */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* الطلبات السابقة وتفاصيلها */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />

        {/* الولاء وبطاقة الولاء وتصميمها */}
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/card-designer" element={<CardDesignerPage />} />

        {/* إدارة السيارات المحفوظة */}
        <Route path="/cars" element={<CarManagementPage />} />

        {/* شاشات الموظفين */}
        <Route path="/cashier" element={<CashierPage />} />

        {/* لوحة الإدارة (بمساراتها الفرعية) */}
        <Route path="/admin/*" element={<AdminPage />} />
      </Route>

      {/* صفحة 404 لكل المسارات غير المعروفة */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
