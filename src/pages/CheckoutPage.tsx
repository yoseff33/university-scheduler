// src/pages/CheckoutPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Car, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'

interface Branch {
  id: string
  name: string
  address: string | null
}

interface CustomerCar {
  id: string
  name: string
  plate_number: string | null
  is_default: boolean
}

interface SupabaseErrorLike {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
}

function readErrorField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function extractErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {
      code: null,
      message: error instanceof Error ? error.message : null,
      details: null,
      hint: null,
    }
  }

  const candidate = error as SupabaseErrorLike

  return {
    code: readErrorField(candidate.code),
    message: readErrorField(candidate.message),
    details: readErrorField(candidate.details),
    hint: readErrorField(candidate.hint),
  }
}

function getCheckoutErrorMessage(error: unknown): string {
  const { code, message, details, hint } = extractErrorDetails(error)
  const normalized = [message, details, hint].filter(Boolean).join(' ').toLowerCase()

  if (normalized.includes('authentication is required') || code === '42501') {
    return 'انتهت جلسة تسجيل الدخول. سجّل دخولك من جديد ثم أعد المحاولة.'
  }

  if (normalized.includes('cart was not found')) {
    return 'تعذر العثور على السلة الحالية. ارجع للسلة وأضف المنتجات من جديد.'
  }

  if (normalized.includes('cart does not belong')) {
    return 'السلة الحالية غير مرتبطة بحسابك. حدّث الصفحة ثم أعد المحاولة.'
  }

  if (normalized.includes('cart is not open')) {
    return 'تم إغلاق السلة أو إنشاء الطلب مسبقاً. ارجع للسلة وابدأ طلباً جديداً.'
  }

  if (normalized.includes('cart is empty') || normalized.includes('cart total must be greater than zero')) {
    return 'السلة فارغة أو إجماليها غير صالح.'
  }

  if (normalized.includes('selected branch is not accepting orders')) {
    return 'الفرع المحدد لا يستقبل الطلبات حالياً. اختر فرعاً آخر.'
  }

  if (normalized.includes('selected branch does not support car delivery')) {
    return 'الفرع المحدد ما يدعم التوصيل للسيارة. اختر الاستلام من الفرع أو فرعاً آخر.'
  }

  if (normalized.includes('a car is required for car delivery')) {
    return 'لازم تختار سيارة قبل تأكيد طلب التوصيل للسيارة.'
  }

  if (normalized.includes('selected car does not belong')) {
    return 'السيارة المحددة غير مرتبطة بحسابك. اختر سيارة مسجلة في حسابك.'
  }

  if (normalized.includes('invalid fulfillment type')) {
    return 'طريقة الاستلام المحددة غير مدعومة.'
  }

  if (code === 'PGRST202') {
    return 'دالة إنشاء الطلب غير ظاهرة لخدمة Supabase حالياً. أعد تحميل Schema Cache.'
  }

  if (code === 'PGRST203') {
    return 'يوجد أكثر من إصدار لدالة إنشاء الطلب في قاعدة البيانات.'
  }

  const rawMessage = [message, details, hint].filter(Boolean).join(' — ')
  return rawMessage || 'تعذر إنشاء الطلب بسبب خطأ غير معروف.'
}

export function CheckoutPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[]>([])
  const [cars, setCars] = useState<CustomerCar[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedCar, setSelectedCar] = useState<string | null>(null)
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'car_delivery'>('pickup')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [branchesResult, carsResult] = await Promise.all([
          client
            .from('branches')
            .select('id, name, address')
            .eq('is_active', true)
            .eq('accepts_orders', true)
            .order('name'),
          client
            .from('customer_cars')
            .select('id, name, plate_number, is_default')
            .eq('user_id', session.user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false }),
        ])

        if (branchesResult.error) throw branchesResult.error
        if (carsResult.error) throw carsResult.error
        if (cancelled) return

        const availableBranches = branchesResult.data ?? []
        const customerCars = carsResult.data ?? []

        setBranches(availableBranches)
        setCars(customerCars)

        setSelectedBranch((current) => {
          if (current && availableBranches.some((branch) => branch.id === current)) {
            return current
          }
          return availableBranches[0]?.id ?? ''
        })

        setSelectedCar((current) => {
          if (current && customerCars.some((car) => car.id === current)) {
            return current
          }
          return customerCars.find((car) => car.is_default)?.id ?? customerCars[0]?.id ?? null
        })
      } catch (err: unknown) {
        if (cancelled) return

        console.error('CHECKOUT_LOAD_ERROR:', extractErrorDetails(err))
        setError(getCheckoutErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [session])

  const handleSubmit = async () => {
    if (!session || submitting) return

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      return
    }

    if (!selectedBranch) {
      setError('الرجاء اختيار الفرع')
      return
    }

    if (fulfillmentType === 'car_delivery' && !selectedCar) {
      setError('الرجاء اختيار السيارة')
      return
    }

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const { data: cart, error: cartError } = await client
        .from('carts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'open')
        .maybeSingle()

      if (cartError) throw cartError
      if (!cart) throw new Error('لا توجد سلة نشطة')

      const { count: itemCount, error: countError } = await client
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('cart_id', cart.id)

      if (countError) throw countError
      if (!itemCount) throw new Error('السلة فارغة')

      const rpcArguments = {
        p_cart_id: cart.id,
        p_branch_id: selectedBranch,
        p_fulfillment_type: fulfillmentType,
        p_car_id: fulfillmentType === 'car_delivery' ? selectedCar : null,
        p_customer_notes: notes.trim() || null,
        p_payment_method: 'pay_at_branch',
      }

      const { data: orderResult, error: orderError } = await client.rpc(
        'create_order_from_cart',
        rpcArguments,
      )

      if (orderError) {
        console.error('CREATE_ORDER_RPC_ERROR:', {
          ...extractErrorDetails(orderError),
          arguments: rpcArguments,
        })
        throw orderError
      }

      const orderId = typeof orderResult === 'string' ? orderResult : null
      if (!orderId) {
        console.error('CREATE_ORDER_INVALID_RESULT:', orderResult)
        throw new Error('لم يتم إرجاع رقم الطلب من قاعدة البيانات')
      }

      setSuccess('تم إنشاء الطلب بنجاح!')
      window.setTimeout(() => navigate(`/orders/${orderId}`), 1200)
    } catch (err: unknown) {
      console.error('CHECKOUT_SUBMIT_ERROR:', extractErrorDetails(err))
      setError(getCheckoutErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader label="جاري التحميل..." />

  const carSelectionMissing = fulfillmentType === 'car_delivery' && !selectedCar

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/cart" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="text-2xl font-black text-vibes-900">إتمام الطلب</h1>
        </header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="mt-4 space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">الفرع</h2>

            {branches.length === 0 ? (
              <p className="mt-3 rounded-xl bg-vibes-50 p-4 text-center text-sm text-vibes-600">
                ما فيه فروع تستقبل الطلبات حالياً.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedBranch(branch.id)}
                    disabled={submitting}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 transition disabled:opacity-60 ${
                      selectedBranch === branch.id
                        ? 'border border-vibes-600 bg-vibes-100'
                        : 'bg-vibes-50'
                    }`}
                  >
                    <MapPin className="size-5 shrink-0 text-vibes-700" />
                    <div className="min-w-0 text-right">
                      <p className="font-bold text-vibes-900">{branch.name}</p>
                      {branch.address && (
                        <p className="truncate text-sm text-vibes-600">{branch.address}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">طريقة الاستلام</h2>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType('pickup')}
                disabled={submitting}
                className={`flex-1 rounded-xl p-3 text-center transition disabled:opacity-60 ${
                  fulfillmentType === 'pickup'
                    ? 'bg-vibes-800 text-white'
                    : 'bg-vibes-100 text-vibes-700'
                }`}
              >
                <span className="block text-lg">🏬</span>
                <span className="text-sm font-bold">استلام من الفرع</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType('car_delivery')}
                disabled={submitting}
                className={`flex-1 rounded-xl p-3 text-center transition disabled:opacity-60 ${
                  fulfillmentType === 'car_delivery'
                    ? 'bg-vibes-800 text-white'
                    : 'bg-vibes-100 text-vibes-700'
                }`}
              >
                <span className="block text-lg">🚗</span>
                <span className="text-sm font-bold">توصيل للسيارة</span>
              </button>
            </div>
          </div>

          {fulfillmentType === 'car_delivery' && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-vibes-900">سيارتي</h2>

              {cars.length === 0 ? (
                <div className="mt-3 text-center">
                  <p className="text-sm text-vibes-600">لا توجد سيارات مسجلة</p>
                  <Link
                    to="/cars"
                    className="mt-2 inline-block text-sm font-bold text-vibes-700 underline"
                  >
                    أضف سيارة
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {cars.map((car) => (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => setSelectedCar(car.id)}
                      disabled={submitting}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 transition disabled:opacity-60 ${
                        selectedCar === car.id
                          ? 'border border-vibes-600 bg-vibes-100'
                          : 'bg-vibes-50'
                      }`}
                    >
                      <Car className="size-5 shrink-0 text-vibes-700" />
                      <div className="min-w-0 text-right">
                        <p className="font-bold text-vibes-900">
                          {car.name}
                          {car.is_default && (
                            <span className="mr-2 text-xs font-medium text-vibes-600">الافتراضية</span>
                          )}
                        </p>
                        {car.plate_number && (
                          <p className="text-sm text-vibes-600">{car.plate_number}</p>
                        )}
                      </div>
                    </button>
                  ))}

                  <Link
                    to="/cars"
                    className="mt-2 inline-block text-sm font-bold text-vibes-700 underline"
                  >
                    إدارة السيارات
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">ملاحظات</h2>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="أي ملاحظات إضافية ..."
              className="mt-3 w-full resize-y rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none disabled:opacity-60"
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
            <p className="mt-1 text-left text-xs text-vibes-500">{notes.length}/500</p>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !selectedBranch || carSelectionMissing}
            className="w-full rounded-2xl bg-vibes-800 py-4 text-lg font-black text-white transition hover:bg-vibes-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
          </button>
        </div>
      </div>
    </main>
  )
}
