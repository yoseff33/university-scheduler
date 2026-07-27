// src/pages/OrderDetailPage.tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { ArrowRight, Clock, CheckCircle, XCircle, Package, MapPin, Car } from 'lucide-react'

interface OrderDetail {
  id: string
  order_number: string
  status: string
  total: number
  subtotal: number
  tax_amount: number
  created_at: string
  fulfillment_type: string
  branch: { name: string; address: string }
  car: { name: string; plate_number: string } | null
  items: {
    id: string
    quantity: number
    unit_price: number
    product_name: string
    size_name: string | null
    addons: { name: string; price: number }[]
  }[]
  status_logs: { status: string; created_at: string }[]
}

const statusMap: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'قيد الانتظار', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  accepted: { label: 'مقبول', icon: CheckCircle, color: 'text-blue-600 bg-blue-100' },
  preparing: { label: 'قيد التحضير', icon: Package, color: 'text-indigo-600 bg-indigo-100' },
  ready: { label: 'جاهز', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100' },
  completed: { label: 'مكتمل', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  cancelled: { label: 'ملغي', icon: XCircle, color: 'text-red-600 bg-red-100' },
}

export function OrderDetailPage() {
  const { orderId } = useParams()
  const { session } = useAuth()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId || !session) return

    const fetchOrder = async () => {
      try {
        // جلب الطلب مع التفاصيل
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            branch:branches(name, address),
            car:customer_cars(name, plate_number),
            order_items(
              id,
              quantity,
              unit_price,
              product_name,
              size_name,
              order_item_addons(addon_name, price)
            ),
            order_status_logs(status, created_at)
          `)
          .eq('id', orderId)
          .eq('user_id', session.user.id)
          .single()

        if (error) throw error
        if (!data) throw new Error('الطلب غير موجود')

        // تحويل البيانات
        const orderData: OrderDetail = {
          ...data,
          items: data.order_items.map((item: any) => ({
            ...item,
            addons: item.order_item_addons?.map((a: any) => ({ name: a.addon_name, price: a.price })) || [],
          })),
          status_logs: data.order_status_logs || [],
        }
        setOrder(orderData)
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل تفاصيل الطلب')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, session])

  if (loading) return <PageLoader label="جاري تحميل الطلب..." />
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>
  if (!order) return <div className="p-4 text-center">الطلب غير موجود</div>

  const statusInfo = statusMap[order.status] || { label: order.status, icon: Clock, color: 'bg-gray-100 text-gray-600' }
  const StatusIcon = statusInfo.icon

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/orders" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">تفاصيل الطلب</h1>
        </header>

        <div className="space-y-6">
          {/* معلومات عامة */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-vibes-600">رقم الطلب</p>
                <p className="text-xl font-black text-vibes-900">#{order.order_number}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${statusInfo.color}`}>
                <StatusIcon className="size-4" />
                {statusInfo.label}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-vibes-600">التاريخ</p>
                <p className="font-bold text-vibes-900">{new Date(order.created_at).toLocaleString('ar-SA')}</p>
              </div>
              <div>
                <p className="text-vibes-600">الإجمالي</p>
                <p className="font-bold text-vibes-900">{order.total} ريال</p>
              </div>
            </div>
          </div>

          {/* الفرع والسيارة */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-vibes-700" />
              <div>
                <p className="font-bold text-vibes-900">{order.branch?.name || 'فرع غير محدد'}</p>
                <p className="text-sm text-vibes-600">{order.branch?.address || ''}</p>
              </div>
            </div>
            {order.fulfillment_type === 'car_delivery' && order.car && (
              <div className="mt-3 flex items-center gap-3 border-t border-vibes-100 pt-3">
                <Car className="size-5 text-vibes-700" />
                <div>
                  <p className="font-bold text-vibes-900">{order.car.name}</p>
                  <p className="text-sm text-vibes-600">{order.car.plate_number}</p>
                </div>
              </div>
            )}
          </div>

          {/* المنتجات */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">المنتجات</h2>
            <div className="mt-3 space-y-4">
              {order.items.map(item => {
                const itemTotal = item.unit_price * item.quantity
                const addonsTotal = item.addons.reduce((s, a) => s + a.price, 0) * item.quantity
                return (
                  <div key={item.id} className="border-b border-vibes-100 pb-3 last:border-0">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold text-vibes-900">{item.product_name}</p>
                        {item.size_name && <p className="text-sm text-vibes-600">الحجم: {item.size_name}</p>}
                        {item.addons.length > 0 && (
                          <div className="mt-1 text-xs text-vibes-500">
                            {item.addons.map((a, i) => (
                              <span key={i}>{a.name} (+{a.price}){i < item.addons.length - 1 && '، '}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-vibes-900">{itemTotal + addonsTotal} ريال</p>
                        <p className="text-xs text-vibes-600">الكمية: {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 border-t border-vibes-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-vibes-600">المجموع الفرعي</span>
                <span>{order.subtotal} ريال</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-vibes-600">الضريبة</span>
                <span>{order.tax_amount} ريال</span>
              </div>
              <div className="mt-2 flex justify-between text-lg font-black text-vibes-900">
                <span>الإجمالي</span>
                <span>{order.total} ريال</span>
              </div>
            </div>
          </div>

          {/* سجل الحالات */}
          {order.status_logs.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-vibes-900">سجل الطلب</h2>
              <div className="mt-3 space-y-2">
                {order.status_logs.map((log, i) => {
                  const info = statusMap[log.status] || { label: log.status, icon: Clock, color: '' }
                  const Icon = info.icon
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Icon className="size-4 text-vibes-600" />
                      <span className="font-medium text-vibes-800">{info.label}</span>
                      <span className="text-vibes-500">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* أزرار إجراءات */}
          {order.status === 'pending' && (
            <button
              onClick={() => {/* يمكن إضافة إلغاء الطلب هنا */}}
              className="w-full rounded-2xl bg-red-50 py-3 text-center font-bold text-red-600 transition hover:bg-red-100"
            >
              إلغاء الطلب
            </button>
          )}
          {order.status === 'ready' && order.fulfillment_type === 'car_delivery' && (
            <button
              onClick={async () => {
                // يمكن تحديث حالة "أنا وصلت"
                try {
                  await supabase
                    .from('orders')
                    .update({ status: 'customer_arrived' })
                    .eq('id', order.id)
                  alert('تم إعلام الموظف بوصولك')
                  window.location.reload()
                } catch (err) {
                  alert('حدث خطأ')
                }
              }}
              className="w-full rounded-2xl bg-vibes-800 py-3 text-center font-bold text-white transition hover:bg-vibes-700"
            >
              أنا وصلت 🚗
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
