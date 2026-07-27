// src/pages/CheckoutPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { ArrowRight, Car, MapPin, CreditCard, CheckCircle } from 'lucide-react'

interface Branch {
  id: string
  name: string
  address: string
}

interface Car {
  id: string
  name: string
  plate_number: string
}

export function CheckoutPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedCar, setSelectedCar] = useState<string | null>(null)
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'car_delivery'>('pickup')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // جلب الفروع والسيارات
  useEffect(() => {
    if (!session) return

    const fetchData = async () => {
      try {
        // جلب الفروع النشطة
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('id, name, address')
          .eq('is_active', true)
          .eq('accepts_orders', true)

        if (branchesError) throw branchesError
        setBranches(branchesData || [])
        if (branchesData && branchesData.length > 0) {
          setSelectedBranch(branchesData[0].id)
        }

        // جلب سيارات العميل
        const { data: carsData, error: carsError } = await supabase
          .from('customer_cars')
          .select('id, name, plate_number')
          .eq('user_id', session.user.id)

        if (carsError) throw carsError
        setCars(carsData || [])
        const defaultCar = carsData?.find(c => c.is_default)
        if (defaultCar) setSelectedCar(defaultCar.id)
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [session])

  const handleSubmit = async () => {
    if (!session) return
    if (!selectedBranch) {
      setError('الرجاء اختيار الفرع')
      return
    }
    if (fulfillmentType === 'car_delivery' && !selectedCar) {
      setError('الرجاء اختيار السيارة')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      // 1. جلب السلة المفتوحة
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'open')
        .single()

      if (cartError || !cart) throw new Error('لا توجد سلة نشطة')

      // 2. جلب عناصر السلة لحساب الإجمالي
      const { data: cartItems, error: itemsError } = await supabase
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

      // حساب الإجمالي
      let total = 0
      for (const item of cartItems || []) {
        let itemTotal = item.unit_price * item.quantity
        // إضافة سعر الحجم
        if (item.size) itemTotal += (item.size.price_adjustment || 0) * item.quantity
        // إضافة الإضافات
        if (item.cart_item_addons) {
          for (const addon of item.cart_item_addons) {
            itemTotal += (addon.addon_option?.price || 0) * item.quantity
          }
        }
        total += itemTotal
      }

      // 3. إنشاء الطلب عبر RPC (افترض وجود دالة create_order_from_cart)
      const { data: order, error: orderError } = await supabase
        .rpc('create_order_from_cart', {
          p_cart_id: cart.id,
          p_branch_id: selectedBranch,
          p_fulfillment_type: fulfillmentType,
          p_car_id: selectedCar,
          p_customer_notes: notes,
          p_payment_method: 'pay_at_branch',
        })

      if (orderError) throw orderError

      setSuccess('تم إنشاء الطلب بنجاح!')
      setTimeout(() => navigate(`/orders/${order.id}`), 1500)
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
          {/* اختيار الفرع */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">الفرع</h2>
            <div className="mt-3 space-y-2">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 transition ${
                    selectedBranch === branch.id ? 'bg-vibes-100 border border-vibes-600' : 'bg-vibes-50'
                  }`}
                >
                  <MapPin className="size-5 text-vibes-700" />
                  <div className="text-right">
                    <p className="font-bold text-vibes-900">{branch.name}</p>
                    <p className="text-sm text-vibes-600">{branch.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* نوع الاستلام */}
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

          {/* اختيار السيارة (للتوصيل للسيارة) */}
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
                  {cars.map(car => (
                    <button
                      key={car.id}
                      onClick={() => setSelectedCar(car.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 transition ${
                        selectedCar === car.id ? 'bg-vibes-100 border border-vibes-600' : 'bg-vibes-50'
                      }`}
                    >
                      <Car className="size-5 text-vibes-700" />
                      <div className="text-right">
                        <p className="font-bold text-vibes-900">{car.name}</p>
                        <p className="text-sm text-vibes-600">{car.plate_number}</p>
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

          {/* ملاحظات */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">ملاحظات</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية ..."
              className="mt-3 w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
              rows={3}
            />
          </div>

          {/* زر تأكيد */}
          <button
            onClick={handleSubmit}
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
