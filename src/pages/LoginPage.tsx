// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState, useRef } from 'react'
import { ArrowLeft, KeyRound, LoaderCircle, Phone, ShieldCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { BrandMark } from '../components/BrandMark'
import { PageLoader } from '../components/PageLoader'
import { useAuth } from '../features/auth/useAuth'
import { appConfig } from '../lib/config'
import { supabase } from '../lib/supabase'
import { getArabicAuthError } from '../utils/authError'
import { normalizeSaudiPhone } from '../utils/phone'

export function LoginPage() {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [phone, setPhone] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  // منع الإرسال المتكرر أثناء معالجة الطلب
  const isSubmitting = useRef(false)

  const destination = useMemo(() => {
    const state = location.state as { from?: string } | null
    return state?.from || '/account'
  }, [location.state])

  // عداد إعادة الإرسال
  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  // إذا كان التحميل جارياً أو الجلسة موجودة نعيد التوجيه
  if (authLoading) return <PageLoader label="جاري التحقق من الجلسة..." />
  if (session) return <Navigate to="/account" replace />

  // دالة إرسال رمز التحقق (تُستخدم في الخطوة الأولى وإعادة الإرسال)
  async function sendOtp(phoneValue: string): Promise<boolean> {
    // منع التداخل
    if (isSubmitting.current) return false
    isSubmitting.current = true

    setError(null)
    setNotice(null)

    const formatted = normalizeSaudiPhone(phoneValue)
    if (!formatted) {
      setError('اكتب رقم جوال سعودي صحيح، مثل 05XXXXXXXX.')
      isSubmitting.current = false
      return false
    }

    if (!supabase) {
      setError('خدمة تسجيل الدخول غير مفعلة حالياً. أضف بيانات Supabase في ملف البيئة.')
      isSubmitting.current = false
      return false
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: { shouldCreateUser: true },
      })

      if (authError) {
        setError(getArabicAuthError(authError))
        isSubmitting.current = false
        return false
      }

      // نجاح الإرسال
      setNormalizedPhone(formatted)
      setStep('otp')
      setSeconds(60)
      setNotice('تم إرسال رمز التحقق من مزوّد الرسائل المرتبط بـ Supabase.')
      isSubmitting.current = false
      return true
    } catch (requestError) {
      setError(getArabicAuthError(requestError))
      isSubmitting.current = false
      return false
    } finally {
      setLoading(false)
    }
  }

  // طلب الرمز (الخطوة الأولى)
  async function requestOtp(event: React.FormEvent) {
    event.preventDefault()
    // إذا كان هناك طلب جارٍ أو لا يوجد رقم، نمنع الإرسال
    if (loading || !phone.trim()) return
    await sendOtp(phone)
  }

  // التحقق من الرمز (الخطوة الثانية)
  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting.current) return
    isSubmitting.current = true

    setError(null)
    setNotice(null)

    if (!supabase || !normalizedPhone) {
      setError('تعذّر متابعة التحقق. ارجع وأدخل رقم الجوال من جديد.')
      isSubmitting.current = false
      return
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('رمز التحقق لازم يكون 6 أرقام.')
      isSubmitting.current = false
      return
    }

    setLoading(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: 'sms',
      })

      if (verifyError) {
        setError(getArabicAuthError(verifyError))
        isSubmitting.current = false
        return
      }

      // نجاح التحقق – التوجيه
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getArabicAuthError(requestError))
    } finally {
      setLoading(false)
      isSubmitting.current = false
    }
  }

  // العودة إلى خطوة إدخال الرقم
  function resetPhone() {
    setStep('phone')
    setOtp('')
    setError(null)
    setNotice(null)
    setSeconds(0)
    isSubmitting.current = false
  }

  // دالة إعادة الإرسال (تُستدعى من الزر)
  async function handleResendOtp() {
    if (seconds > 0 || loading) return
    // نستخدم الرقم الموحد إن وجد، وإلا الرقم الحالي
    const numberToSend = normalizedPhone ?? phone
    if (numberToSend) {
      await sendOtp(numberToSend)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-vibes-pattern px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-24 top-16 size-72 rounded-full bg-vibes-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-0 size-80 rounded-full bg-vibes-600/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 backdrop-blur-xl card-shadow lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden min-h-[640px] flex-col justify-between bg-vibes-800 p-10 text-vibes-50 lg:flex">
            <BrandMark />
            <div>
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold">طلبك، ولاؤك، وفايبزك بمكان واحد</p>
              <h1 className="max-w-xl text-5xl font-black leading-[1.2]">تجربة كوفي تبدأ من جوالك وتوصل لين سيارتك.</h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-vibes-100/80">هذه المرحلة تربط الدخول والحساب فعلياً مع Supabase. بقية الخدمات تظهر بوضوح على أنها غير مفعلة إلى أن يكتمل ربطها.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-vibes-100/80">
              <ShieldCheck className="size-5" />
              <span>لا يوجد OTP تجريبي ولا تسجيل دخول وهمي.</span>
            </div>
          </section>

          <section className="flex min-h-[640px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="mb-10 lg:hidden"><BrandMark /></div>

            <div className="mx-auto w-full max-w-md">
              <p className="text-sm font-black text-vibes-600">مرحباً بك في {appConfig.appName}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-vibes-900 sm:text-4xl">
                {step === 'phone' ? 'سجّل دخولك برقم الجوال' : 'أدخل رمز التحقق'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-vibes-600">
                {step === 'phone' ? 'بنرسل لك رمز OTP حقيقي عن طريق مزوّد الرسائل المضبوط في Supabase.' : `أرسلنا الرمز إلى ${normalizedPhone ?? ''}`}
              </p>

              {!appConfig.isSupabaseConfigured && (
                <div className="mt-6">
                  <Alert type="info">Supabase غير مربوط حالياً. انسخ <code>.env.example</code> إلى <code>.env.local</code> وأضف القيم الحقيقية.</Alert>
                </div>
              )}

              {error && <div className="mt-6"><Alert type="error">{error}</Alert></div>}
              {notice && <div className="mt-6"><Alert type="success">{notice}</Alert></div>}

              {step === 'phone' ? (
                <form className="mt-8 space-y-5" onSubmit={requestOtp} noValidate>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-vibes-900">رقم الجوال</span>
                    <span className="relative block">
                      <Phone className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-vibes-500" />
                      <input
                        className="h-14 w-full rounded-2xl border border-vibes-200 bg-white pr-12 pl-4 text-left text-lg font-bold tracking-wide text-vibes-900 transition focus:border-vibes-600"
                        dir="ltr"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="05XXXXXXXX"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={loading}
                      />
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-vibes-800 px-5 font-black text-white transition hover:bg-vibes-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading || !phone.trim()}
                  >
                    {loading ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowLeft className="size-5" />}
                    إرسال رمز التحقق
                  </button>
                </form>
              ) : (
                <form className="mt-8 space-y-5" onSubmit={verifyOtp} noValidate>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-vibes-900">رمز OTP</span>
                    <span className="relative block">
                      <KeyRound className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-vibes-500" />
                      <input
                        className="h-14 w-full rounded-2xl border border-vibes-200 bg-white px-12 text-center text-2xl font-black tracking-[0.45em] text-vibes-900 transition focus:border-vibes-600"
                        dir="ltr"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                      />
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-vibes-800 px-5 font-black text-white transition hover:bg-vibes-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading && <LoaderCircle className="size-5 animate-spin" />}
                    تأكيد الدخول
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
                    <button type="button" className="text-vibes-700 underline underline-offset-4" onClick={resetPhone}>
                      تغيير رقم الجوال
                    </button>
                    <button
                      type="button"
                      className="text-vibes-700 disabled:text-vibes-300"
                      disabled={seconds > 0 || loading}
                      onClick={handleResendOtp}
                    >
                      {seconds > 0 ? `إعادة الإرسال بعد ${seconds}ث` : 'إعادة إرسال الرمز'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
