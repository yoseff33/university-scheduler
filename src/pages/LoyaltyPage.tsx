// src/pages/LoyaltyPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { ArrowRight, Award, History } from 'lucide-react'

interface LoyaltyData {
  loyalty_points: number
  membership_number: string
  name: string | null
}

interface Transaction {
  id: string
  transaction_type?: string
  quantity?: number
  points?: number
  balance_after?: number
  reason?: string | null
  description?: string | null
  created_at: string
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const message = typeof candidate.message === 'string' ? candidate.message : ''

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('loyalty_transactions') && message.toLowerCase().includes('not found'))
  )
}

export function LoyaltyPage() {
  const { session } = useAuth()
  const [data, setData] = useState<LoyaltyData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
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

    const fetchLoyalty = async () => {
      try {
        // جلب الملف الشخصي
        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile) throw new Error('الملف الشخصي غير موجود')

        setData({
          loyalty_points:
            typeof profile.loyalty_points === 'number' ? profile.loyalty_points : 0,
          membership_number:
            typeof profile.membership_number === 'string' ? profile.membership_number : '',
          name: typeof profile.name === 'string' ? profile.name : null,
        })

        // جلب سجل النقاط بفلتر customer_id
        const { data: trans, error: transError } = await client
          .from('loyalty_transactions')
          .select('*')
          .eq('customer_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (transError && !isMissingRelationError(transError)) throw transError
        setTransactions(transError ? [] : (trans ?? []))
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل بيانات الولاء')
      } finally {
        setLoading(false)
      }
    }

    void fetchLoyalty()
  }, [session])

  if (loading) return <PageLoader label="جاري تحميل الولاء..." />
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>
  if (!data) return <div className="p-4 text-center">لا توجد بيانات</div>

  // حساب التقدم نحو المكافأة (مثلاً 100 نقطة)
  const target = 100
  const progress = Math.min((data.loyalty_points / target) * 100, 100)

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/home" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">بطاقة الولاء</h1>
        </header>

        <div className="space-y-6">
          {/* البطاقة */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-vibes-800 to-vibes-600 p-6 text-white shadow-lg">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-vibes-200">فايبز | Vibes</p>
                <p className="mt-1 text-lg font-black">{data.name || 'ضيف'}</p>
                <p className="text-sm text-vibes-300">رقم العضوية: {data.membership_number}</p>
              </div>
              <Award className="size-12 text-vibes-300" />
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-sm text-vibes-200">نقاط الولاء</p>
                <p className="text-3xl font-black">{data.loyalty_points}</p>
              </div>
              <div className="text-left">
                <p className="text-sm text-vibes-200">المكافأة القادمة</p>
                <p className="text-lg font-bold">{Math.max(0, target - data.loyalty_points)} نقطة متبقية</p>
              </div>
            </div>
            <div className="mt-4 h-3 rounded-full bg-vibes-700">
              <div className="h-full rounded-full bg-vibes-200 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* سجل النقاط */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-vibes-900">
              <History className="size-5" />
              سجل النقاط
            </h2>
            {transactions.length === 0 ? (
              <p className="mt-4 text-center text-sm text-vibes-600">لا توجد حركات</p>
            ) : (
              <div className="mt-3 space-y-3">
                {transactions.map(t => {
                  const pointsVal = t.quantity ?? t.points ?? 0
                  const isPositive = pointsVal >= 0
                  const desc = t.reason ?? t.description ?? 'تعديل نقاط'
                  return (
                    <div key={t.id} className="flex items-center justify-between border-b border-vibes-100 pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isPositive ? '+' : '-'}{Math.abs(pointsVal)}
                        </span>
                        <span className="text-sm text-vibes-600">{desc}</span>
                      </div>
                      <div className="text-right text-xs text-vibes-500">
                        {new Date(t.created_at).toLocaleDateString('ar-SA')}
                        {t.balance_after !== undefined && <span className="mr-2">الرصيد: {t.balance_after}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* زر تصميم البطاقة */}
          <Link to="/card-designer" className="block w-full rounded-2xl bg-vibes-800 py-3.5 text-center font-bold text-white transition hover:bg-vibes-700">
            تخصيص بطاقتي 🎨
          </Link>
        </div>
      </div>
    </main>
  )
}
