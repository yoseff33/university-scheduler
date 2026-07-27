// src/pages/CartPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { ArrowRight, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react'

interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  size_name: string | null
  quantity: number
  unit_price: number
  notes: string | null
  addons: { name: string; price: number }[]
}

export function CartPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // حساب الإجمالي
  const total = items.reduce((sum, item) => {
    const itemTotal = item.unit_price * item.quantity
    const addonsTotal = item.addons.reduce((s, a) => s + a.price, 0) * item.quantity
    return sum + itemTotal + addonsTotal
  }, 0)

  useEffect(() => {
    if (!session) return

    const fetchCart = async () => {
      try {
        // جلب السلة المفتوحة
        const { data: cart, error: cartError } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'open')
          .maybeSingle()

        if (cartError) throw cartError
        if (!cart) {
          setItems([])
          setCartId(null)
          setLoading(false)
          return
        }

        setCartId(cart.id)

        // جلب عناصر السلة مع تفاصيل المنتج والحجم والإضافات
        const { data: itemsData, error: itemsError } = await supabase
          .from('cart_items')
          .select(`
            id,
            quantity,
            unit_price,
            notes,
            product:products(name, image_url),
            size:product_sizes(name),
            cart_item_addons(addon_option:addon_options(name, price))
          `)
          .eq('cart_id', cart.id)

        if (itemsError) throw itemsError

        const parsedItems: CartItem[] = itemsData.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || 'منتج',
          product_image: item.product?.image_url || null,
          size_name: item.size?.name || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes,
          addons: item.cart_item_addons?.map((a: any) => ({
            name: a.addon_option?.name || 'إضافة',
            price: a.addon_option?.price || 0,
          })) || [],
        }))

        setItems(parsedItems)
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل السلة')
      } finally {
        setLoading(false)
      }
    }

    fetchCart()
  }, [session])

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (err) {
      console.error(err)
      setError('تعذر تحديث الكمية')
    } finally {
      setUpdating(false)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdating(true)
    try {
      // حذف الإضافات أولاً (إذا كانت مرتبطة)
      await supabase
        .from('cart_item_addons')
        .delete()
        .eq('cart_item_id', itemId)

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (err) {
      console.error(err)
      setError('تعذر حذف العنصر')
    } finally {
      setUpdating(false)
    }
  }

  const clearCart = async () => {
    if (!cartId) return
    setUpdating(true)
    try {
      // حذف جميع العناصر
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)

      if (error) throw error
      setItems([])
    } catch (err) {
      console.error(err)
      setError('تعذر تفريغ السلة')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <PageLoader label="جاري تحميل السلة..." />

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/menu" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">سلة الطلبات</h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-sm font-bold text-red-500">
              تفريغ
            </button>
          )}
        </header>

        {error && <Alert type="error">{error}</Alert>}

        {items.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto size-16 text-vibes-300" />
            <p className="mt-4 text-lg font-bold text-vibes-900">سلتك فارغة</p>
            <p className="text-sm text-vibes-600">تصفح المنيو وأضف ما ترغب</p>
            <Link to="/menu" className="mt-4 inline-block rounded-full bg-vibes-800 px-6 py-2.5 font-bold text-white">
              ابدأ الطلب
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {items.map(item => {
                const itemPrice = item.unit_price * item.quantity
                const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0) * item.quantity
                const totalItem = itemPrice + addonsPrice

                return (
                  <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex gap-4">
                      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-vibes-100">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl text-vibes-300">☕</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-vibes-900">{item.product_name}</p>
                        {item.size_name && <p className="text-sm text-vibes-600">الحجم: {item.size_name}</p>}
                        {item.addons.length > 0 && (
                          <div className="mt-1 text-xs text-vibues-500">
                            {item.addons.map((a, i) => (
                              <span key={i}>
                                {a.name} (+{a.price})
                                {i < item.addons.length - 1 && '، '}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center rounded-lg border border-vibes-200">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 px-2 text-vibes-700"
                              disabled={updating}
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 px-2 text-vibes-700"
                              disabled={updating}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-red-500"
                            disabled={updating}
                          >
                            <Trash2 className="size-5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-vibes-900">{totalItem} ريال</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* الملخص */}
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex justify-between border-b border-vibes-100 pb-3">
                <span className="font-bold text-vibes-900">المجموع</span>
                <span className="font-bold text-vibes-900">{total} ريال</span>
              </div>
              <div className="mt-3 flex justify-between">
                <span className="text-sm text-vibes-600">الضريبة (غير مفعلة)</span>
                <span className="text-sm text-vibes-600">٠</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-vibes-100 pt-3">
                <span className="text-lg font-black text-vibes-900">الإجمالي</span>
                <span className="text-lg font-black text-vibes-900">{total} ريال</span>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                disabled={items.length === 0 || updating}
                className="mt-4 w-full rounded-2xl bg-vibes-800 py-3.5 font-bold text-white transition hover:bg-vibes-700 disabled:opacity-50"
              >
                متابعة للدفع
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
