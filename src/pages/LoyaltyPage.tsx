// src/pages/LoyaltyPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { ArrowRight, Award, History, Coffee, Gift } from 'lucide-react'
import { getActiveCups, getAllCups, redeemReward, getActiveRewards, type LoyaltyCup, type LoyaltyReward } from '../services/loyaltyService'

interface ProfileData {
  membership_number: string
  name: string | null
}

export function LoyaltyPage() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [activeCups, setActiveCups] = useState<LoyaltyCup[]>([])
  const [allCups, setAllCups] = useState<LoyaltyCup[]>([])
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('membership_number, name')
          .eq('id', userId)
          .maybeSingle()
        if (profileError) throw profileError
        setProfile(profileData)

        const cups = await getActiveCups(userId)
        setActiveCups(cups)

        const all = await getAllCups(userId)
        setAllCups(all)

        const rewardsData = await getActiveRewards(userId)
        setRewards(rewardsData)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'تعذر تحميل بيانات الولاء')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleRedeem = async () => {
    if (!userId) return
    if (activeCups.length < 6) {
      setError('يجب أن تمتلك 6 أكواب نشطة لاستبدال المكافأة')
      return
    }
    setRedeeming(true)
    setError(null)
    setSuccess(null)
    try {
      const reward = await redeemReward(userId)
      setSuccess(`تم استبدال المكافأة بنجاح! كود: ${reward.reward_code || 'مشروب مجاني'}`)
      const updatedCups = await getActiveCups(userId)
      setActiveCups(updatedCups)
      const all = await getAllCups(userId)
      setAllCups(all)
      const rewardsData = await getActiveRewards(userId)
      setRewards(rewardsData)
    } catch (err: any) {
      setError(err.message || 'فشل استبدال المكافأة')
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) return <PageLoader label="جاري تحميل الولاء..." />
  if (error && !profile) return <div className="p-4 text-center text-red-600">{error}</div>

  const cupCount = activeCups.length
  const target = 6
  const progress = Math.min((cupCount / target) * 100, 100)
  const canRedeem = cupCount >= target

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/home" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">بطاقة الولاء</h1>
        </header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-vibes-800 to-vibes-600 p-6 text-white shadow-lg">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-vibes-200">فايبز | Vibes</p>
                <p className="mt-1 text-lg font-black">{profile?.name || 'ضيف'}</p>
                <p className="text-sm text-vibes-300">رقم العضوية: {profile?.membership_number || '—'}</p>
              </div>
              <Coffee className="size-12 text-vibes-300" />
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-sm text-vibes-200">الأكواب النشطة</p>
                <p className="text-3xl font-black">{cupCount} / {target}</p>
              </div>
              <div className="text-left">
                <p className="text-sm text-vibes-200">المكافأة القادمة</p>
                <p className="text-lg font-bold">
                  {canRedeem ? '🎉 جاهز للاستبدال!' : `${target - cupCount} كوب متبقي`}
                </p>
              </div>
            </div>
            <div className="mt-4 h-3 rounded-full bg-vibes-700">
              <div
                className="h-full rounded-full bg-vibes-200 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {canRedeem && (
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="mt-4 w-full rounded-2xl bg-white py-3 font-black text-vibes-800 transition hover:bg-vibes-100 disabled:opacity-50"
              >
                {redeeming ? 'جاري الاستبدال...' : 'استبدال المكافأة 🎁'}
              </button>
            )}
          </div>

          {rewards.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-vibes-900">
                <Gift className="size-5" />
                المكافآت المتاحة
              </h2>
              <div className="mt-3 space-y-2">
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-vibes-100 pb-2">
                    <span className="text-sm font-bold text-emerald-600">
                      {r.reward_code ? `كود: ${r.reward_code}` : 'مشروب مجاني'}
                    </span>
                    <span className="text-xs text-vibes-500">
                      {new Date(r.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-vibes-900">
              <History className="size-5" />
              سجل الأكواب
            </h2>
            {allCups.length === 0 ? (
              <p className="mt-4 text-center text-sm text-vibes-600">لا توجد حركات</p>
            ) : (
              <div className="mt-3 space-y-3">
                {allCups.map((cup) => {
                  const statusMap = {
                    active: '🟢 نشط',
                    redeemed: '🔵 مستخدم',
                    revoked: '🔴 ملغي'
                  }
                  return (
                    <div key={cup.id} className="flex items-center justify-between border-b border-vibes-100 pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <Coffee className="size-4 text-vibes-600" />
                        <span className="text-sm text-vibes-600">{statusMap[cup.status]}</span>
                      </div>
                      <div className="text-right text-xs text-vibes-500">
                        {new Date(cup.created_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Link
            to="/card-designer"
            className="block w-full rounded-2xl bg-vibes-800 py-3.5 text-center font-bold text-white transition hover:bg-vibes-700"
          >
            تخصيص بطاقتي 🎨
          </Link>
        </div>
      </div>
    </main>
  )
}
