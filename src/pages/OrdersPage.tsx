// src/pages/OrdersPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { ArrowRight, Clock, CheckCircle, XCircle, Package } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  branch: { name: string } | null
  status: string
  total: number
  created_at: string
  fulfillment_type: string
}

const statusMap: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'قيد الانتظار', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  accepted: { label: 'مقبول', icon: CheckCircle, color: 'text-blue-600 bg-blue-100' },
  preparing: { label: 'قيد التحضير', icon: Package, color: 'text-indigo-600 bg-indigo-100' },
  ready: { label: 'جاهز', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100' },
  completed: { label: 'مكتمل', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  cancelled: { label: 'ملغي', icon: XCircle, color: 'text-red-600 bg-red-100' },
}

export function OrdersPage() {
  const { session } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
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

    const fetchOrders = async () => {
      try {
        const { data, error } = await client
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            total,
            created_at,
            fulfillment_type,
            branch:branches(name)
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        const parsedOrders: Order[] = (data ?? []).map((item: any) => ({
          id: item.id,
          order_number: item.order_number,
          branch: item.branch ?? null,
          status: item.status,
          total: item.total,
          created_at: item.created_at,
          fulfillment_type: item.fulfillment_type,
        }))
        setOrders(parsedOrders)
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل الطلبات')
      } finally {
        setLoading(false)
      }
    }

    void fetchOrders()
  }, [session])

  if (loading) return <PageLoader label="جاري تحميل الطلبات..." />

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/home" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">طلباتي</h1>
        </header>

        {error && <div className="p-4 text-center text-red-600">{error}</div>}

        {orders.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <Package className="mx-auto size-16 text-vibes-300" />
            <p className="mt-4 text-lg font-bold text-vibes-900">لا توجد طلبات</p>
            <p className="text-sm text-vibes-600">ابدأ طلبك الأول الآن</p>
            <Link to="/menu" className="mt-4 inline-block rounded-full bg-vibes-800 px-6 py-2.5 font-bold text-white">
              تصفح المنيو
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {orders.map(order => {
              const statusInfo = statusMap[order.status] || { label: order.status, icon: Clock, color: 'bg-gray-100 text-gray-600' }
              const StatusIcon = statusInfo.icon
              return (
                <Link key={order.id} to={`/orders/${order.id}`} className="block">
                  <div className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-vibes-900">#{order.order_number}</p>
                        <p className="text-sm text-vibes-600">{order.branch?.name || 'فرع غير محدد'}</p>
                        <p className="text-sm text-vibes-600">{new Date(order.created_at).toLocaleString('ar-SA')}</p>
                      </div>
                      <div className="text-left">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${statusInfo.color}`}>
                          <StatusIcon className="size-3" />
                          {statusInfo.label}
                        </span>
                        <p className="mt-1 font-bold text-vibes-900">{order.total} ريال</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-vibes-500">
                      {order.fulfillment_type === 'car_delivery' ? '🚗 توصيل للسيارة' : '🏬 استلام من الفرع'}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
