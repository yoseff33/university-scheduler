// src/pages/LoyaltyPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock3,
  Coffee,
  Gift,
  History,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import type { Json } from '../types/database'

interface LoyaltyProfile {
  name: string | null
  membership_number: string
}

interface LoyaltySettings {
  cups_required: number
  minimum_order_amount: number
  reward_type: string
  reward_expiry_days: number | null
  is_program_active: boolean
}

interface Reward {
  id: string
  reward_code: string
  reward_type: string
  discount_value: number | null
  status: 'active' | 'used' | 'expired' | 'cancelled'
  created_at: string
  expires_at: string | null
  used_at: string | null
}

interface LoyaltyTransaction {
  id: string
  transaction_type:
    | 'cup_granted'
    | 'cup_redeemed'
    | 'cup_revoked'
    | 'reward_created'
    | 'reward_used'
    | 'reward_expired'
    | 'manual_adjustment'
  order_id: string | null
  description: string | null
  created_at: string
}

interface RedeemResponse {
  success: boolean
  code: string
  message: string
  activeCups?: number
  requiredCups?: number
}

const TRANSACTIONS_PAGE_SIZE = 20

function formatMembershipNumber(value: string) {
  if (!value) return '—'
  return value.startsWith('VIB-') ? value : `VIB-${value}`
}

function formatDate(value: string | null) {
  if (!value) return 'غير محدد'

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function parseRedeemResponse(value: Json): RedeemResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.success !== 'boolean' ||
    typeof candidate.code !== 'string' ||
    typeof candidate.message !== 'string'
  ) {
    return null
  }

  return {
    success: candidate.success,
    code: candidate.code,
    message: candidate.message,
    activeCups: typeof candidate.activeCups === 'number' ? candidate.activeCups : undefined,
    requiredCups: typeof candidate.requiredCups === 'number' ? candidate.requiredCups : undefined,
  }
}

function transactionPresentation(transaction: LoyaltyTransaction) {
  switch (transaction.transaction_type) {
    case 'cup_granted':
      return {
        icon: <Coffee className="size-5" />,
        title: transaction.description || 'حصلت على كوب ولاء',
        tone: 'bg-emerald-100 text-emerald-700',
      }
    case 'cup_redeemed':
      return {
        icon: <CheckCircle2 className="size-5" />,
        title: transaction.description || 'تم استبدال أكواب الولاء',
        tone: 'bg-vibes-100 text-vibes-700',
      }
    case 'cup_revoked':
      return {
        icon: <XCircle className="size-5" />,
        title: transaction.description || 'تم إلغاء كوب ولاء',
        tone: 'bg-red-100 text-red-700',
      }
    case 'reward_created':
      return {
        icon: <Gift className="size-5" />,
        title: transaction.description || 'حصلت على مكافأة جديدة',
        tone: 'bg-amber-100 text-amber-700',
      }
    case 'reward_used':
      return {
        icon: <Award className="size-5" />,
        title: transaction.description || 'تم استخدام المكافأة',
        tone: 'bg-sky-100 text-sky-700',
      }
    case 'reward_expired':
      return {
        icon: <Clock3 className="size-5" />,
        title: transaction.description || 'انتهت صلاحية المكافأة',
        tone: 'bg-slate-100 text-slate-700',
      }
    default:
      return {
        icon: <History className="size-5" />,
        title: transaction.description || 'تعديل على رصيد الولاء',
        tone: 'bg-vibes-100 text-vibes-700',
      }
  }
}

export function LoyaltyPage() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null)
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)
  const [activeCups, setActiveCups] = useState(0)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session) return

    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [profileResult, settingsResult, cupsResult, rewardsResult, transactionsResult] =
        await Promise.all([
          client
            .from('profiles')
            .select('name, membership_number')
            .eq('id', session.user.id)
            .maybeSingle(),
          client
            .from('loyalty_settings')
            .select(
              'cups_required, minimum_order_amount, reward_type, reward_expiry_days, is_program_active',
            )
            .eq('id', 1)
            .maybeSingle(),
          client
            .from('loyalty_cups')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', session.user.id)
            .eq('status', 'active'),
          client
            .from('loyalty_rewards')
            .select(
              'id, reward_code, reward_type, discount_value, status, created_at, expires_at, used_at',
            )
            .eq('customer_id', session.user.id)
            .order('created_at', { ascending: false }),
          client
            .from('loyalty_transactions')
            .select('id, transaction_type, order_id, description, created_at')
            .eq('customer_id', session.user.id)
            .order('created_at', { ascending: false })
            .range(0, TRANSACTIONS_PAGE_SIZE - 1),
        ])

      if (profileResult.error) throw profileResult.error
      if (!profileResult.data) throw new Error('الملف الشخصي غير موجود')
      if (settingsResult.error) throw settingsResult.error
      if (!settingsResult.data) throw new Error('إعدادات برنامج الولاء غير موجودة')
      if (cupsResult.error) throw cupsResult.error
      if (rewardsResult.error) throw rewardsResult.error
      if (transactionsResult.error) throw transactionsResult.error

      setProfile(profileResult.data)
      setSettings(settingsResult.data)
      setActiveCups(cupsResult.count ?? 0)
      setRewards(rewardsResult.data ?? [])
      setTransactions(transactionsResult.data ?? [])
      setHasMoreTransactions((transactionsResult.data?.length ?? 0) === TRANSACTIONS_PAGE_SIZE)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error(err)
      setError(
        err instanceof Error && err.message.includes('إعدادات برنامج الولاء')
          ? 'برنامج الولاء غير مفعّل بالكامل. نفّذ ملف SQL المرفق داخل Supabase.'
          : 'تعذر تحميل بيانات الولاء، حاول مرة ثانية.',
      )
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const loadMoreTransactions = async () => {
    if (!session || loadingMore || !hasMoreTransactions) return

    const client = supabase
    if (!client) return

    setLoadingMore(true)
    setError(null)

    try {
      const start = transactions.length
      const { data, error: loadError } = await client
        .from('loyalty_transactions')
        .select('id, transaction_type, order_id, description, created_at')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(start, start + TRANSACTIONS_PAGE_SIZE - 1)

      if (loadError) throw loadError

      const next = data ?? []
      setTransactions((current) => [...current, ...next])
      setHasMoreTransactions(next.length === TRANSACTIONS_PAGE_SIZE)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر تحميل المزيد من سجل الحركات.')
    } finally {
      setLoadingMore(false)
    }
  }

  const redeemReward = async () => {
    if (!settings || !session || redeeming) return

    if (!settings.is_program_active) {
      setError('برنامج الولاء متوقف مؤقتاً.')
      return
    }

    if (activeCups < settings.cups_required) {
      setError(`تحتاج إلى ${settings.cups_required} أكواب نشطة لاستبدال المكافأة.`)
      return
    }

    if (!window.confirm('متأكد تبي تستبدل أكوابك وتحصل على المكافأة؟')) return

    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      return
    }

    setRedeeming(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error: redeemError } = await client.rpc('redeem_reward')
      if (redeemError) throw redeemError

      const result = parseRedeemResponse(data)
      if (!result) throw new Error('استجابة الاستبدال غير صالحة')
      if (!result.success) {
        setError(result.message)
        return
      }

      setSuccess(result.message)
      await loadData()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر استبدال المكافأة. ما تم خصم أي كوب، حاول مرة ثانية.')
    } finally {
      setRedeeming(false)
    }
  }

  const activeRewards = useMemo(
    () => rewards.filter((reward) => reward.status === 'active'),
    [rewards],
  )

  if (loading) return <PageLoader label="جاري تحميل أكوابك..." />

  if (!profile || !settings) {
    return (
      <main className="min-h-screen bg-vibes-pattern px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Alert type="error">{error || 'الخدمة غير مفعلة حالياً.'}</Alert>
        </div>
      </main>
    )
  }

  const requiredCups = settings.cups_required
  const filledCups = Math.min(activeCups, requiredCups)
  const remainingCups = Math.max(requiredCups - activeCups, 0)
  const progress = requiredCups > 0 ? Math.min((activeCups / requiredCups) * 100, 100) : 0
  const canRedeem = settings.is_program_active && activeCups >= requiredCups

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-24">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/account" className="rounded-full bg-white p-2 shadow" aria-label="العودة للحساب">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-vibes-900">بطاقة الولاء</h1>
            <p className="mt-1 text-sm text-vibes-600">كل طلب مؤهل يقرّبك من كوبك المجاني.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-full bg-white p-2 text-vibes-800 shadow"
            aria-label="تحديث البيانات"
          >
            <RefreshCw className="size-5" />
          </button>
        </header>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}

        {!settings.is_program_active && (
          <div className="mb-4"><Alert type="error">برنامج الولاء متوقف مؤقتاً.</Alert></div>
        )}

        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-vibes-900 via-vibes-800 to-vibes-600 p-6 text-white shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-vibes-200">فايبز | Vibes</p>
              <h2 className="mt-2 text-2xl font-black">{profile.name?.trim() || 'ضيف فايبز'}</h2>
              <p className="mt-1 text-sm text-vibes-200">
                رقم العضوية: {formatMembershipNumber(profile.membership_number)}
              </p>
            </div>
            <div className="grid size-14 place-items-center rounded-2xl bg-white/10">
              <Coffee className="size-8 text-vibes-200" />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold text-vibes-200">أكوابك النشطة</p>
              <p className="mt-2 text-3xl font-black">{activeCups}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold text-vibes-200">المطلوب للمكافأة</p>
              <p className="mt-2 text-3xl font-black">{requiredCups}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold text-vibes-200">المكافآت المتاحة</p>
              <p className="mt-2 text-3xl font-black">{activeRewards.length}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm font-bold text-vibes-100">
              <span>{filledCups} من {requiredCups} أكواب</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div
            className="mt-6 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(requiredCups, 8)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: requiredCups }, (_, index) => {
              const earned = index < filledCups
              return (
                <div
                  key={index}
                  className={`grid aspect-square min-h-11 place-items-center rounded-2xl border transition ${
                    earned
                      ? 'border-white/40 bg-white text-vibes-800 shadow'
                      : 'border-white/20 bg-white/5 text-white/40'
                  }`}
                  aria-label={earned ? `الكوب ${index + 1} مكتسب` : `الكوب ${index + 1} غير مكتسب`}
                >
                  <Coffee className="size-5 sm:size-6" />
                </div>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-black/15 p-4 text-center">
            <p className="font-black">
              {canRedeem
                ? 'مبروك! اكتملت أكوابك، مكافأتك جاهزة ☕'
                : remainingCups === 1
                  ? 'باقي لك كوب واحد، وبعدها مكافأتك علينا ☕'
                  : `باقي لك ${remainingCups} أكواب، وبعدها مكافأتك علينا ☕`}
            </p>
            {canRedeem && (
              <button
                type="button"
                onClick={() => void redeemReward()}
                disabled={redeeming}
                className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-black text-vibes-900 disabled:opacity-60"
              >
                {redeeming ? <LoaderCircle className="size-5 animate-spin" /> : <Gift className="size-5" />}
                استبدال المكافأة
              </button>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <Gift className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-vibes-900">مكافآتي</h2>
              <p className="text-sm text-vibes-600">اعرض رمز المكافأة للكاشير وقت الاستخدام.</p>
            </div>
          </div>

          {activeRewards.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-vibes-200 p-7 text-center">
              <PackageOpen className="mx-auto size-9 text-vibes-400" />
              <p className="mt-3 font-bold text-vibes-800">ما عندك مكافآت متاحة حالياً.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {activeRewards.map((reward) => (
                <article key={reward.id} className="rounded-3xl border border-vibes-100 bg-vibes-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                        متاحة
                      </span>
                      <h3 className="mt-3 font-black text-vibes-900">
                        {reward.reward_type === 'free_drink' ? 'مشروب مجاني' : reward.reward_type}
                      </h3>
                      <p dir="ltr" className="mt-1 text-sm font-bold text-vibes-700">
                        {reward.reward_code}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-2">
                      <QRCodeSVG value={`VIB-REWARD:${reward.reward_code}`} size={82} level="M" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-vibes-600">
                    <p>تاريخ الإصدار: {formatDate(reward.created_at)}</p>
                    <p>تنتهي: {formatDate(reward.expires_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-vibes-100 text-vibes-700">
              <History className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-vibes-900">سجل الحركات</h2>
              <p className="text-sm text-vibes-600">كل عملية محفوظة بترتيب زمني.</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-vibes-200 p-7 text-center">
              <Coffee className="mx-auto size-9 text-vibes-400" />
              <p className="mt-3 font-bold text-vibes-800">
                ما عندك أكواب إلى الآن، أول كوب ينتظرك مع طلبك الجاي.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {transactions.map((transaction) => {
                const presentation = transactionPresentation(transaction)
                return (
                  <article key={transaction.id} className="flex items-start gap-3 rounded-2xl bg-vibes-50 p-4">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${presentation.tone}`}>
                      {presentation.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-vibes-900">{presentation.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-vibes-600">
                        <span>{formatDate(transaction.created_at)}</span>
                        {transaction.order_id && <span>الطلب: {transaction.order_id}</span>}
                      </div>
                    </div>
                  </article>
                )
              })}

              {hasMoreTransactions && (
                <button
                  type="button"
                  onClick={() => void loadMoreTransactions()}
                  disabled={loadingMore}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-vibes-200 font-black text-vibes-800 disabled:opacity-60"
                >
                  {loadingMore && <LoaderCircle className="size-5 animate-spin" />}
                  تحميل المزيد
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
