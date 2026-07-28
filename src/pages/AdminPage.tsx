// src/pages/AdminPage.tsx
import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import {
  Award,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  Tags,
  Users,
} from 'lucide-react'
import { PageLoader } from '../components/PageLoader'
import { useAuth } from '../features/auth/useAuth'
import { supabase } from '../lib/supabase'

// صفحات الإدارة الفرعية (سنبنيها بسيطة حالياً)
function AdminDashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-black text-vibes-900">لوحة التحكم</h2>
      <p className="text-vibes-600">هنا تظهر الإحصائيات والتقارير</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-vibes-800">0</p>
          <p className="text-sm text-vibes-600">الطلبات</p>
        </div>

        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-vibes-800">0</p>
          <p className="text-sm text-vibes-600">العملاء</p>
        </div>

        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-vibes-800">0</p>
          <p className="text-sm text-vibes-600">المنتجات</p>
        </div>

        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-vibes-800">0</p>
          <p className="text-sm text-vibes-600">الفروع</p>
        </div>
      </div>
    </div>
  )
}

function AdminProducts() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">إدارة المنتجات</h2>
      <p className="text-vibes-600">قائمة المنتجات هنا</p>
    </div>
  )
}

function AdminCategories() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">إدارة التصنيفات</h2>
      <p className="text-vibes-600">قائمة التصنيفات هنا</p>
    </div>
  )
}

function AdminBranches() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">إدارة الفروع</h2>
      <p className="text-vibes-600">قائمة الفروع هنا</p>
    </div>
  )
}

function AdminCustomers() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">إدارة العملاء</h2>
      <p className="text-vibes-600">قائمة العملاء هنا</p>
    </div>
  )
}

function AdminLoyalty() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">إدارة الولاء</h2>
      <p className="text-vibes-600">إعدادات الولاء</p>
    </div>
  )
}

function AdminStickers() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">إدارة الملصقات</h2>
      <p className="text-vibes-600">قائمة الملصقات هنا</p>
    </div>
  )
}

export function AdminPage() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    const client = supabase

    if (!session || !client) {
      setIsAdmin(false)
      setLoading(false)

      return () => {
        active = false
      }
    }

    setLoading(true)

    const checkAdmin = async () => {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!active) return

      const hasAdminRole =
        !error &&
        data !== null &&
        (data.role === 'admin' || data.role === 'super_admin')

      setIsAdmin(hasAdminRole)
      setLoading(false)
    }

    void checkAdmin()

    return () => {
      active = false
    }
  }, [session])

  if (loading) {
    return <PageLoader label="جاري التحقق من الصلاحيات..." />
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center font-bold text-red-600">
        ليس لديك صلاحية للدخول إلى لوحة الإدارة
      </div>
    )
  }

  const navItems = [
    { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
    { to: '/admin/products', label: 'المنتجات', icon: Package },
    { to: '/admin/categories', label: 'التصنيفات', icon: Tags },
    { to: '/admin/branches', label: 'الفروع', icon: Store },
    { to: '/admin/customers', label: 'العملاء', icon: Users },
    { to: '/admin/loyalty', label: 'الولاء', icon: Award },
    { to: '/admin/stickers', label: 'الملصقات', icon: ImageIcon },
  ]

  return (
    <div className="flex min-h-screen bg-vibes-pattern">
      {/* شريط جانبي */}
      <aside className="hidden w-64 bg-white p-4 shadow-sm lg:block">
        <div className="mb-8 flex items-center gap-3">
          <span className="text-2xl font-black text-vibes-800">فايبز</span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/admin' && location.pathname.startsWith(item.to))

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isActive
                    ? 'bg-vibes-100 text-vibes-800'
                    : 'text-vibes-600 hover:bg-vibes-50'
                }`}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="size-5" />
          تسجيل الخروج
        </button>
      </aside>

      {/* المحتوى */}
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/categories" element={<AdminCategories />} />
          <Route path="/branches" element={<AdminBranches />} />
          <Route path="/customers" element={<AdminCustomers />} />
          <Route path="/loyalty" element={<AdminLoyalty />} />
          <Route path="/stickers" element={<AdminStickers />} />
        </Routes>
      </main>
    </div>
  )
}
