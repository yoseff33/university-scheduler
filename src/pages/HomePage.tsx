// src/pages/HomePage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { supabase } from '../lib/supabase'
import { BrandMark } from '../components/BrandMark'
import { PageLoader } from '../components/PageLoader'
import { Coffee, MapPin, Clock, Award } from 'lucide-react'

interface Profile {
  name: string | null
  membership_number: string
  loyalty_points: number
}

interface Branch {
  id: string
  name: string
  opening_time: string | null
  closing_time: string | null
  accepts_orders: boolean
}

function isBranchOpen(branch: Branch, now = new Date()) {
  if (!branch.accepts_orders) return false
  if (!branch.opening_time || !branch.closing_time) return true

  const toMinutes = (value: string) => {
    const [hours = 0, minutes = 0] = value.split(':').map(Number)
    return hours * 60 + minutes
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openingMinutes = toMinutes(branch.opening_time)
  const closingMinutes = toMinutes(branch.closing_time)

  if (openingMinutes <= closingMinutes) {
    return currentMinutes >= openingMinutes && currentMinutes < closingMinutes
  }

  return currentMinutes >= openingMinutes || currentMinutes < closingMinutes
}

export function HomePage() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // جلب الملف الشخصي
        const { data: profileData, error: profileError } = await client
          .from('profiles')
          .select('name, membership_number, loyalty_points')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError
        setProfile(profileData)

        // جلب الفرع الافتراضي (أول فرع نشط)
        const { data: branchData, error: branchError } = await client
          .from('branches')
          .select('id, name, opening_time, closing_time, accepts_orders')
          .eq('is_active', true)
          .order('name')
          .limit(1)

        if (branchError) throw branchError
        if (branchData && branchData.length > 0) {
          setBranch(branchData[0])
        }
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [session])

  const branchIsOpen = branch ? isBranchOpen(branch) : false

  if (loading) return <PageLoader label="جاري تحميل الصفحة..." />
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-6xl">
        {/* الهيدر */}
        <header className="flex items-center justify-between py-4">
          <BrandMark />
          <Link to="/account" className="rounded-full bg-white p-2 shadow-md">
            {session?.user?.phone ? (
              <span className="flex size-10 items-center justify-center rounded-full bg-vibes-800 text-white font-bold">
                {session.user.phone?.slice(-2)}
              </span>
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full bg-vibes-200 text-vibes-800">
                <span className="text-xl">👤</span>
              </span>
            )}
          </Link>
        </header>

        {/* بطاقة الترحيب */}
        <section className="mt-4 rounded-3xl bg-vibes-800 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-vibes-200">مرحباً بك 👋</p>
              <h1 className="text-2xl font-black">{profile?.name || 'ضيف فايبز'}</h1>
              <p className="mt-1 text-sm text-vibes-300">رقم العضوية: {profile?.membership_number || '—'}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-2 text-center">
              <p className="text-xs text-vibes-300">نقاط الولاء</p>
              <p className="text-2xl font-black">{profile?.loyalty_points || 0}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/menu" className="flex items-center gap-2 rounded-full bg-vibes-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-vibes-600">
              <Coffee className="size-4" /> طلب الآن
            </Link>
            <Link to="/loyalty" className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/30">
              <Award className="size-4" /> بطاقتي
            </Link>
          </div>
        </section>

        {/* حالة الفرع */}
        {branch && (
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-vibes-700" />
                <div>
                  <p className="font-bold text-vibes-900">{branch.name}</p>
                  <p className="text-sm text-vibes-600">
                    {branchIsOpen ? (
                      <span className="flex items-center gap-1 text-emerald-600"><Clock className="size-4" /> مفتوح الآن</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600"><Clock className="size-4" /> مغلق</span>
                    )}
                  </p>
                </div>
              </div>
              <Link to="/menu" className="text-sm font-bold text-vibes-700">اطلب</Link>
            </div>
          </section>
        )}

        {/* تصنيفات سريعة */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-vibes-900">التصنيفات</h2>
            <Link to="/menu" className="text-sm font-bold text-vibes-600">عرض الكل</Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {['مشروبات ساخنة', 'مشروبات باردة', 'حلويات'].map((cat, i) => (
              <Link key={i} to={`/menu?category=${encodeURIComponent(cat)}`} className="rounded-2xl bg-white p-4 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-vibes-100 text-vibes-700">
                  {i === 0 && <Coffee className="size-7" />}
                  {i === 1 && <Coffee className="size-7" />}
                  {i === 2 && <Coffee className="size-7" />}
                </div>
                <p className="mt-2 text-sm font-bold text-vibes-900">{cat}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* عروض / منتجات مميزة (سيتم جلبها من Supabase) */}
        <section className="mt-6">
          <h2 className="text-lg font-black text-vibes-900">الأكثر طلباً</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="h-28 rounded-xl bg-vibes-100 animate-pulse"></div>
                <p className="mt-2 text-sm font-bold text-vibes-900">منتج {i}</p>
                <p className="text-sm text-vibes-600">١٢ ريال</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
