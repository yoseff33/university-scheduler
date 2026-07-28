// src/pages/AccountPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Coffee, LoaderCircle, LogOut, QrCode, Save, ShieldCheck, UserRound, Home, ShoppingBag, ClipboardList, Award, Car, Palette, Users, Store } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { BrandMark } from '../components/BrandMark'
import { PageLoader } from '../components/PageLoader'
import { ServiceUnavailableCard } from '../components/ServiceUnavailableCard'
import { useAuth } from '../features/auth/useAuth'
import { getAvatarSignedUrl, getMyProfile, removeAvatar, updateMyProfile, uploadAvatar } from '../services/profileService'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import { maskPhone } from '../utils/phone'

export function AccountPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user.id ?? ''
  const fileInput = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0)

  const membershipLabel = useMemo(() => profile ? `VIB-${profile.membership_number}` : '—', [profile])

  // جلب الملف الشخصي ودور المستخدم ونقاط الولاء
  useEffect(() => {
    if (!userId) return
    let active = true

    const fetchData = async () => {
      try {
        // 1. جلب الملف الشخصي
        const profileData = await getMyProfile(userId)
        if (!active) return
        setProfile(profileData)
        setName(profileData.name ?? '')
        setMarketingConsent(profileData.marketing_consent)
        const signed = await getAvatarSignedUrl(profileData.avatar_url)
        if (active) setAvatarUrl(signed)

        // 2. جلب نقاط الولاء مباشرة من العمود loyalty_points في جدول profiles
        // لأننا أضفناه في المخطط الأخير
        if (supabase) {
          // محاولة جلب من loyalty_accounts إذا كان الجدول موجوداً (للتوافق مع الإصدارات السابقة)
          // لكننا نفضل استخدام loyalty_points من profiles
          const { data: loyaltyData, error: loyaltyError } = await supabase
            .from('loyalty_accounts')
            .select('points_balance')
            .eq('user_id', userId)
            .maybeSingle()

          if (!loyaltyError && loyaltyData) {
            setLoyaltyPoints(loyaltyData.points_balance || 0)
          } else {
            // إذا فشل جلب loyalty_accounts، نستخدم loyalty_points من profiles
            const points = profileData?.loyalty_points || 0
            setLoyaltyPoints(points)
          }

          // جلب دور المستخدم
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle()

          if (!roleError && roleData) {
            setUserRole(roleData.role)
          }
        } else {
          // إذا كان supabase غير مهيأ، نعرض قيمة افتراضية أو خطأ
          setError('خدمة Supabase غير متاحة حالياً')
        }
      } catch (err) {
        if (!active) return
        if (import.meta.env.DEV) console.error(err)
        setError('تعذّر تحميل الملف الشخصي. تأكد من تشغيل Migration المرحلة الأولى وسياسات RLS.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function selectAvatar(file: File | undefined) {
    setError(null)
    setSuccess(null)
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('اختر صورة PNG أو JPEG أو WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة لازم يكون 5MB أو أقل.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingAvatar(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!profile || !userId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    let uploadedAvatarPath: string | null = null

    try {
      let avatarPath = profile.avatar_url
      if (pendingAvatar) {
        uploadedAvatarPath = await uploadAvatar(userId, pendingAvatar)
        avatarPath = uploadedAvatarPath
      }

      const previousAvatarPath = profile.avatar_url
      const updated = await updateMyProfile({
        name: name.trim() || null,
        avatarPath,
        marketingConsent,
      })

      if (uploadedAvatarPath && previousAvatarPath && previousAvatarPath !== uploadedAvatarPath) {
        void removeAvatar(previousAvatarPath).catch((cleanupError) => {
          if (import.meta.env.DEV) console.warn('Old avatar cleanup failed', cleanupError)
        })
      }

      setProfile(updated)
      setPendingAvatar(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setAvatarUrl(await getAvatarSignedUrl(updated.avatar_url))
      setSuccess('تم حفظ بيانات حسابك فعلياً في Supabase.')
    } catch (requestError) {
      if (uploadedAvatarPath) {
        void removeAvatar(uploadedAvatarPath).catch(() => undefined)
      }
      if (import.meta.env.DEV) console.error(requestError)
      setError(requestError instanceof Error && requestError.message.includes('5MB') ? requestError.message : 'ما قدرنا نحفظ التعديلات. راجع إعدادات Storage وRLS ثم جرّب مرة ثانية.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setError('تعذّر تسجيل الخروج. جرّب مرة ثانية.')
    }
  }

  if (loading) return <PageLoader label="جاري تحميل حساب فايبز..." />

  return (
    <main className="min-h-screen bg-vibes-pattern safe-bottom pb-20">
      <header className="sticky top-0 z-20 border-b border-vibes-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-3">
            <Link to="/home" className="inline-flex items-center gap-1.5 rounded-2xl border border-vibes-200 bg-white px-4 py-2.5 text-sm font-black text-vibes-800 transition hover:bg-vibes-50">
              <Home className="size-4" />
              الرئيسية
            </Link>
            <button onClick={() => void handleSignOut()} className="inline-flex items-center gap-2 rounded-2xl border border-vibes-200 bg-white px-4 py-2.5 text-sm font-black text-vibes-800 transition hover:bg-vibes-50">
              <LogOut className="size-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        {error && <div className="mb-5"><Alert type="error">{error}</Alert></div>}
        {success && <div className="mb-5"><Alert type="success">{success}</Alert></div>}

        {/* روابط سريعة للصفحات الرئيسية */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link to="/menu" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
            <ShoppingBag className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">المنيو</span>
          </Link>
          <Link to="/orders" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
            <ClipboardList className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">طلباتي</span>
          </Link>
          <Link to="/loyalty" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
            <Award className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">الولاء</span>
          </Link>
          <Link to="/cars" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
            <Car className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">سياراتي</span>
          </Link>
          <Link to="/card-designer" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
            <Palette className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">تصميم البطاقة</span>
          </Link>
          {(userRole === 'cashier' || userRole === 'branch_manager' || userRole === 'admin' || userRole === 'super_admin') && (
            <Link to="/cashier" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
              <Users className="size-5 text-vibes-700" />
              <span className="text-sm font-bold text-vibes-900">الكاشير</span>
            </Link>
          )}
          {(userRole === 'admin' || userRole === 'super_admin') && (
            <Link to="/admin" className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
              <Store className="size-5 text-vibes-700" />
              <span className="text-sm font-bold text-vibes-900">الإدارة</span>
            </Link>
          )}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="overflow-hidden rounded-[2rem] bg-vibes-800 p-6 text-white card-shadow sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-bold text-vibes-200">بطاقة عضوية فايبز</p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">{profile?.name?.trim() || 'ضيف فايبز'}</h1>
                <p className="mt-2 font-semibold text-vibes-200">{maskPhone(profile?.phone ?? null)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-vibes-700 px-3 py-1 text-xs font-bold text-vibes-200">
                    🏆 {loyaltyPoints} نقطة
                  </span>
                </div>
              </div>
              <div className="grid size-24 place-items-center overflow-hidden rounded-3xl border border-white/20 bg-white/10">
                {previewUrl || avatarUrl ? (
                  <img src={previewUrl || avatarUrl || ''} alt="صورة العميل" className="size-full object-cover" />
                ) : (
                  <UserRound className="size-11 text-vibes-200" />
                )}
              </div>
            </div>

            <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-vibes-300">Membership</p>
                <p className="mt-2 text-2xl font-black tracking-wide">{membershipLabel}</p>
              </div>
              <div className="rounded-2xl bg-white p-2 text-vibes-900" aria-label={`رمز عضوية ${membershipLabel}`}>
                {profile ? <QRCodeSVG value={`VIB:${profile.membership_number}`} size={88} level="M" includeMargin={false} /> : <QrCode className="size-20" />}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-bold text-vibes-200">أكواب الولاء</p>
                <p className="mt-2 text-sm font-black">{Math.floor(loyaltyPoints / 10)} كوب</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-bold text-vibes-200">حالة المكافأة</p>
                <p className="mt-2 text-sm font-black">
                  {loyaltyPoints >= 100 ? '🟢 مؤهل' : '🔵 قيد التقدم'}
                </p>
              </div>
            </div>
          </article>

          <form className="rounded-[2rem] border border-white bg-white/90 p-6 card-shadow sm:p-8" onSubmit={saveProfile}>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-vibes-100 text-vibes-700"><ShieldCheck className="size-5" /></div>
              <div>
                <h2 className="text-xl font-black text-vibes-900">بيانات حسابي</h2>
                <p className="mt-1 text-sm text-vibes-600">التعديل يتم عن طريق دالة آمنة، بدون السماح بتغيير رقم العضوية أو الدور.</p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-vibes-900">الاسم</span>
                <input className="h-13 w-full rounded-2xl border border-vibes-200 bg-white px-4 font-bold text-vibes-900 focus:border-vibes-600" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتب اسمك" />
              </label>

              <div>
                <span className="mb-2 block text-sm font-black text-vibes-900">الصورة الشخصية</span>
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => selectAvatar(event.target.files?.[0])} />
                <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-vibes-300 bg-vibes-50 px-4 py-4 text-sm font-black text-vibes-800" onClick={() => fileInput.current?.click()}>
                  <Camera className="size-5" />
                  اختيار صورة حتى 5MB
                </button>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-vibes-100 bg-vibes-50 p-4">
                <input type="checkbox" className="mt-1 size-5 accent-vibes-700" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} />
                <span>
                  <span className="block text-sm font-black text-vibes-900">الموافقة على الرسائل التسويقية</span>
                  <span className="mt-1 block text-xs leading-6 text-vibes-600">لا يتم إرسال أي رسالة واتساب تسويقية قبل ربط الخدمة والحصول على موافقتك.</span>
                </span>
              </label>
            </div>

            <button className="mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-vibes-800 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving || !profile}>
              {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
              حفظ التعديلات
            </button>
          </form>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <Coffee className="size-6 text-vibes-700" />
            <h2 className="text-xl font-black text-vibes-900">خدمات الحساب القادمة</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ServiceUnavailableCard title="أكواب الولاء" phase="مرحلة برنامج الولاء" />
            <ServiceUnavailableCard title="السيارات المحفوظة" phase="مرحلة الطلب من السيارة" />
            <ServiceUnavailableCard title="الطلبات السابقة" phase="مرحلة نظام الطلبات" />
            <ServiceUnavailableCard title="تصميم البطاقة" phase="مرحلة محرر بطاقة الولاء" />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-vibes-100 bg-white/80 p-5">
          <div className="flex items-start gap-3">
            <Check className="mt-1 size-5 shrink-0 text-emerald-600" />
            <p className="text-sm leading-7 text-vibes-700">المعروض هنا من بيانات الحساب يأتي من Supabase فقط. أما الخدمات التي لم تُنشأ جداولها ومنطقها بعد، فلا يعرض النظام أرقاماً أو نتائج وهمية لها.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
