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
    if (!session) return

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const { data: branchesData, error: branchesError } = await client
          .from('branches')
          .select('id, name, address')
          .eq('is_active', true)
          .eq('accepts_orders', true)

        if (branchesError) throw branchesError

        const availableBranches = branchesData ?? []
        setBranches(availableBranches)
        if (availableBranches.length > 0) {
          setSelectedBranch(availableBranches[0].id)
        }

        const { data: carsData, error: carsError } = await client
          .from('customer_cars')
          .select('id, name, plate_number, is_default')
          .eq('user_id', session.user.id)

        if (carsError) throw carsError

        const customerCars = carsData ?? []
        setCars(customerCars)
        const defaultCar = customerCars.find((car) => car.is_default)
        if (defaultCar) setSelectedCar(defaultCar.id)
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [session])

  const handleSubmit = async () => {
    if (!session) return

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
        .single()

      if (cartError || !cart) throw cartError ?? new Error('لا توجد سلة نشطة')

      const { data: cartItems, error: itemsError } = await client
        .from('cart_items')
        .select(`
          id,
          quantity,
          unit_price,
          size:product_sizes(price_adjustment),
          cart_item_addons(addon_option:addon_options(price))
        `)
        .eq('cart_id', cart.id)

      if (itemsError) throw itemsError

      let calculatedTotal = 0
      for (const item of cartItems ?? []) {
        let itemTotal = item.unit_price * item.quantity
        if (item.size) {
          itemTotal += (item.size.price_adjustment ?? 0) * item.quantity
        }
        for (const addon of item.cart_item_addons ?? []) {
          itemTotal += (addon.addon_option?.price ?? 0) * item.quantity
        }
        calculatedTotal += itemTotal
      }

      if (calculatedTotal <= 0) {
        throw new Error('السلة فارغة')
      }

      const { data: orderId, error: orderError } = await client.rpc('create_order_from_cart', {
        p_cart_id: cart.id,
        p_branch_id: selectedBranch,
        p_fulfillment_type: fulfillmentType,
        p_car_id: fulfillmentType === 'car_delivery' ? selectedCar : null,
        p_customer_notes: notes || null,
        p_payment_method: 'pay_at_branch',
      })

      if (orderError) throw orderError
      if (!orderId) throw new Error('لم يتم إرجاع رقم الطلب')

      setSuccess('تم إنشاء الطلب بنجاح!')
      window.setTimeout(() => navigate(`/orders/${orderId}`), 1500)
    } catch (err) {
      console.error(err)
      setError('تعذر إنشاء الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader label="جاري التحميل..." />

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
            <div className="mt-3 space-y-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 transition ${
                    selectedBranch === branch.id ? 'border border-vibes-600 bg-vibes-100' : 'bg-vibes-50'
                  }`}
                >
                  <MapPin className="size-5 text-vibes-700" />
                  <div className="text-right">
                    <p className="font-bold text-vibes-900">{branch.name}</p>
                    <p className="text-sm text-vibes-600">{branch.address ?? ''}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">طريقة الاستلام</h2>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setFulfillmentType('pickup')}
                className={`flex-1 rounded-xl p-3 text-center transition ${
                  fulfillmentType === 'pickup' ? 'bg-vibes-800 text-white' : 'bg-vibes-100 text-vibes-700'
                }`}
              >
                <span className="block text-lg">🏬</span>
                <span className="text-sm font-bold">استلام من الفرع</span>
              </button>
              <button
                onClick={() => setFulfillmentType('car_delivery')}
                className={`flex-1 rounded-xl p-3 text-center transition ${
                  fulfillmentType === 'car_delivery' ? 'bg-vibes-800 text-white' : 'bg-vibes-100 text-vibes-700'
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
                  <Link to="/cars" className="mt-2 inline-block text-sm font-bold text-vibes-700 underline">
                    أضف سيارة
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {cars.map((car) => (
                    <button
                      key={car.id}
                      onClick={() => setSelectedCar(car.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 transition ${
                        selectedCar === car.id ? 'border border-vibes-600 bg-vibes-100' : 'bg-vibes-50'
                      }`}
                    >
                      <Car className="size-5 text-vibes-700" />
                      <div className="text-right">
                        <p className="font-bold text-vibes-900">{car.name}</p>
                        <p className="text-sm text-vibes-600">{car.plate_number ?? ''}</p>
                      </div>
                    </button>
                  ))}
                  <Link to="/cars" className="mt-2 inline-block text-sm font-bold text-vibes-700 underline">
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
              className="mt-3 w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
              rows={3}
            />
          </div>

          <button
            onClick={() => void handleSubmit()}
            disabled={submitting || !selectedBranch}
            className="w-full rounded-2xl bg-vibes-800 py-4 text-lg font-black text-white transition hover:bg-vibes-700 disabled:opacity-50"
          >
            {submitting ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
          </button>
        </div>
      </div>
    </main>
  )
}
