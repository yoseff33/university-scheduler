import { useMemo, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Phone, ShieldCheck, UserPlus } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { BrandMark } from '../components/BrandMark'
import { PageLoader } from '../components/PageLoader'
import { useAuth } from '../features/auth/useAuth'
import { appConfig } from '../lib/config'
import { supabase } from '../lib/supabase'
import { getArabicAuthError } from '../utils/authError'
import { normalizeSaudiPhone } from '../utils/phone'

type AuthMode = 'signIn' | 'signUp'

export function LoginPage() {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<AuthMode>('signIn')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // نقبل مساراً داخلياً فقط حتى ما يصير تحويل إلى رابط خارجي.
  const destination = useMemo(() => {
    const state = location.state as { from?: string } | null
    const requestedPath = state?.from
    return requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
      ? requestedPath
      : '/account'
  }, [location.state])

  if (authLoading) return <PageLoader label="جاري التحقق من الجلسة..." />
  if (session) return <Navigate to="/account" replace />

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setNotice(null)
    setPassword('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError(null)
    setNotice(null)

    const normalizedPhone = normalizeSaudiPhone(phone)
    if (!normalizedPhone) {
      setError('اكتب رقم جوال سعودي صحيح، مثل 05XXXXXXXX.')
      return
    }

    if (password.length < 8) {
      setError('كلمة المرور لازم تكون 8 خانات على الأقل.')
      return
    }

    if (!supabase) {
      setError('خدمة تسجيل الدخول غير مفعلة. أضف بيانات Supabase الصحيحة في ملف البيئة.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signIn') {
        // دخول مباشر برقم الجوال وكلمة المرور بدون OTP.
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        })

        if (signInError) throw signInError
        if (!data.session) throw new Error('missing_session')

        navigate(destination, { replace: true })
        return
      }

      // إنشاء حساب جديد برقم الجوال وكلمة المرور.
      // يلزم تعطيل Confirm phone في Supabase حتى تُنشأ الجلسة مباشرة بدون OTP.
      const { data, error: signUpError } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
      })

      if (signUpError) throw signUpError

      if (!data.session) {
        setError('تم إنشاء الحساب، لكن Supabase ما أنشأ جلسة دخول. عطّل خيار Confirm phone من إعدادات Phone Auth ثم جرّب بحساب جديد.')
        return
      }

      setNotice('تم إنشاء الحساب وتسجيل الدخول بنجاح.')
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getArabicAuthError(requestError))
    } finally {
      setLoading(false)
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
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
                طلبك، ولاؤك، وفايبزك بمكان واحد
              </p>
              <h1 className="max-w-xl text-5xl font-black leading-[1.2]">
                تجربة كوفي تبدأ من جوالك وتوصل لين سيارتك.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-vibes-100/80">
                دخول مباشر وآمن برقم الجوال وكلمة المرور، والجلسة محفوظة فعلياً عن طريق Supabase.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-vibes-100/80">
              <ShieldCheck className="size-5" />
              <span>لا يوجد رمز OTP ولا تسجيل دخول وهمي.</span>
            </div>
          </section>

          <section className="flex min-h-[640px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="mb-10 lg:hidden">
              <BrandMark />
            </div>

            <div className="mx-auto w-full max-w-md">
              <p className="text-sm font-black text-vibes-600">مرحباً بك في {appConfig.appName}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-vibes-900 sm:text-4xl">
                {mode === 'signIn' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-vibes-600">
                {mode === 'signIn'
                  ? 'اكتب رقم جوالك وكلمة المرور للدخول مباشرة.'
                  : 'أنشئ حسابك برقم الجوال وكلمة المرور بدون رمز تحقق.'}
              </p>

              <div className="mt-6 grid grid-cols-2 rounded-2xl bg-vibes-50 p-1">
                <button
                  type="button"
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    mode === 'signIn' ? 'bg-white text-vibes-900 card-shadow' : 'text-vibes-600'
                  }`}
                  onClick={() => switchMode('signIn')}
                  disabled={loading}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    mode === 'signUp' ? 'bg-white text-vibes-900 card-shadow' : 'text-vibes-600'
                  }`}
                  onClick={() => switchMode('signUp')}
                  disabled={loading}
                >
                  حساب جديد
                </button>
              </div>

              {!appConfig.isSupabaseConfigured && (
                <div className="mt-6">
                  <Alert type="info">
                    Supabase غير مربوط حالياً. أضف القيم الحقيقية في ملف <code>.env.local</code>.
                  </Alert>
                </div>
              )}

              {error && (
                <div className="mt-6">
                  <Alert type="error">{error}</Alert>
                </div>
              )}

              {notice && (
                <div className="mt-6">
                  <Alert type="success">{notice}</Alert>
                </div>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-vibes-900">رقم الجوال</span>
                  <span className="relative block">
                    <Phone className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-vibes-500" />
                    <input
                      className="h-14 w-full rounded-2xl border border-vibes-200 bg-white pr-12 pl-4 text-left text-lg font-bold tracking-wide text-vibes-900 transition focus:border-vibes-600"
                      dir="ltr"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="05XXXXXXXX"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={loading}
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-vibes-900">كلمة المرور</span>
                  <span className="relative block">
                    <KeyRound className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-vibes-500" />
                    <input
                      className="h-14 w-full rounded-2xl border border-vibes-200 bg-white px-12 text-left font-bold text-vibes-900 transition focus:border-vibes-600"
                      dir="ltr"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                      placeholder="8 خانات على الأقل"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-vibes-500 transition hover:text-vibes-800"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-vibes-800 px-5 font-black text-white transition hover:bg-vibes-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading || !phone.trim() || password.length < 8 || !appConfig.isSupabaseConfigured}
                >
                  {loading ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : mode === 'signIn' ? (
                    <ArrowLeft className="size-5" />
                  ) : (
                    <UserPlus className="size-5" />
                  )}
                  {mode === 'signIn' ? 'دخول' : 'إنشاء الحساب والدخول'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
