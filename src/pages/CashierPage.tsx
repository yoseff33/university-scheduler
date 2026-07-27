// src/pages/CashierPage.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { Search, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  user_id: string
  branch_id: string
  fulfillment_type: string
  customer_name: string | null
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'قيد التحضير', color: 'bg-indigo-100 text-indigo-700' },
  ready: { label: 'جاهز', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
}

export function CashierPage() {
  const { session } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const fetchOrders = async () => {
    if (!session) return
    try {
      // جلب الطلبات حسب صلاحية الكاشير (يفترض أنه يرى طلبات فرعه)
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, status, total, created_at, user_id, branch_id, fulfillment_type,
          profiles(name)
        `)
        .order('created_at', { ascending: false })

      // يمكن إضافة فلتر حسب الفرع إذا كان الكاشير مرتبطاً بفرع
      // هنا نأخذ جميع الطلبات للتوضيح

      const { data, error } = await query
      if (error) throw error

      const formatted = data.map((item: any) => ({
        ...item,
        customer_name: item.profiles?.name || null
      }))
      setOrders(formatted)
    } catch (err) {
      console.error(err)
      setError('تعذر تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    // اشتراك Realtime لتحديث الطلبات لحظياً
    const subscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [session])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      // التحديث التلقائي سيأتي من Realtime
    } catch (err) {
      console.error(err)
      setError('تعذر تحديث الحالة')
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.includes(searchTerm) ||
                          (order.customer_name && order.customer_name.includes(searchTerm))
    const matchesStatus = filterStatus ? order.status === filterStatus : true
    return matchesSearch && matchesStatus
  })

  if (loading) return <PageLoader label="جاري تحميل لوحة الكاشير..." />

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-black text-vibes-900">لوحة الكاشير</h1>
          <button onClick={fetchOrders} className="rounded-full bg-white p-2 shadow">
            <RefreshCw className="size-5 text-vibes-700" />
          </button>
        </header>

        {error && <Alert type="error">{error}</Alert>}

        {/* أدوات البحث والفلترة */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-vibes-400" />
            <input
              type="text"
              placeholder="بحث برقم الطلب أو اسم العميل"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-vibes-200 bg-white pr-10 pl-4 py-2.5 text-sm focus:border-vibes-600 focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-vibes-200 bg-white px-4 py-2.5 text-sm focus:border-vibes-600 focus:outline-none"
          >
            <option value="">جميع الحالات</option>
            {Object.entries(statusMap).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {/* قائمة الطلبات */}
        <div className="mt-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <p className="text-vibes-600">لا توجد طلبات</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const status = statusMap[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' }
              return (
                <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-vibes-900">#{order.order_number}</p>
                      <p className="text-sm text-vibes-600">العميل: {order.customer_name || 'غير معروف'}</p>
                      <p className="text-sm text-vibes-600">{order.fulfillment_type === 'car_delivery' ? '🚗 توصيل للسيارة' : '🏬 استلام من الفرع'}</p>
                      <p className="text-sm text-vibes-500">{new Date(order.created_at).toLocaleString('ar-SA')}</p>
                    </div>
                    <div className="text-left">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      <p className="mt-1 font-bold text-vibes-900">{order.total} ريال</p>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-vibes-100 pt-3">
                    {order.status === 'pending' && (
                      <>
                        <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-200">
                          قبول
                        </button>
                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-bold text-red-700 transition hover:bg-red-200">
                          رفض
                        </button>
                      </>
                    )}
                    {order.status === 'accepted' && (
                      <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-200">
                        بدء التحضير
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button onClick={() => updateOrderStatus(order.id, 'ready')} className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-200">
                        جاهز
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button onClick={() => updateOrderStatus(order.id, 'completed')} className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-bold text-green-700 transition hover:bg-green-200">
                        إكمال
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
