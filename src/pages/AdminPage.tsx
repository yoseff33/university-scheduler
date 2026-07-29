import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Image as ImageIcon, LayoutDashboard, LogOut, Menu, Package, Puzzle, Store, Tags, Users, X } from 'lucide-react'
import { PageLoader } from '../components/PageLoader'
import { useAuth } from '../features/auth/useAuth'
import { supabase } from '../lib/supabase'
import { AdminDashboardPage } from './admin/AdminDashboardPage'
import { AdminProductsPage } from './admin/AdminProductsPage'
import { AdminCategoriesPage } from './admin/AdminCategoriesPage'
import { AdminBranchesPage } from './admin/AdminBranchesPage'
import { AdminAddonsPage } from './admin/AdminAddonsPage'
import { AdminCustomersPage } from './admin/AdminCustomersPage'
import { AdminStickersPage } from './admin/AdminStickersPage'

const navItems = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/categories', label: 'التصنيفات', icon: Tags },
  { to: '/admin/branches', label: 'الفروع', icon: Store },
  { to: '/admin/addons', label: 'الإضافات', icon: Puzzle },
  { to: '/admin/customers', label: 'العملاء', icon: Users },
  { to: '/admin/stickers', label: 'الملصقات', icon: ImageIcon },
]

export function AdminPage() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let active = true
    const client = supabase
    if (!session || !client) { setIsAdmin(false); setLoading(false); return () => { active = false } }
    setLoading(true)
    void client.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return
      setIsAdmin(!error && !!data && ['admin', 'super_admin', 'branch_manager'].includes(data.role))
      setLoading(false)
    })
    return () => { active = false }
  }, [session])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  if (loading) return <PageLoader label="جاري التحقق من الصلاحيات..." />
  if (!isAdmin) return <div className="p-8 text-center font-bold text-red-600">ليس لديك صلاحية للدخول إلى لوحة الإدارة</div>

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="mb-7 flex items-center justify-between"><Link to="/home" className="text-2xl font-black text-vibes-800">فايبز</Link><button className="lg:hidden" onClick={() => setMobileOpen(false)}><X className="size-5" /></button></div>
      <nav className="space-y-1">
        {navItems.map((item) => { const active = location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to)); return <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-vibes-100 text-vibes-800' : 'text-vibes-600 hover:bg-vibes-50'}`}><item.icon className="size-5" />{item.label}</Link> })}
      </nav>
      <div className="mt-auto pt-6"><Link to="/home" className="mb-2 block rounded-xl px-4 py-3 text-sm font-bold text-vibes-700 hover:bg-vibes-50">العودة للموقع</Link><button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"><LogOut className="size-5" />تسجيل الخروج</button></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-vibes-pattern lg:flex">
      <aside className="hidden w-64 shrink-0 bg-white p-4 shadow-sm lg:block"><Sidebar /></aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="إغلاق القائمة" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-72 bg-white p-4 shadow-xl"><Sidebar /></aside></div>}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-vibes-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden"><button onClick={() => setMobileOpen(true)} className="rounded-xl bg-vibes-100 p-2 text-vibes-800"><Menu className="size-5" /></button><span className="font-black text-vibes-900">لوحة إدارة فايبز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الموقع</Link></header>
        <Routes>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="branches" element={<AdminBranchesPage />} />
          <Route path="addons" element={<AdminAddonsPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="stickers" element={<AdminStickersPage />} />
        </Routes>
      </main>
    </div>
  )
}
