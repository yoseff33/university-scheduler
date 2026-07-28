// src/pages/ProductDetailPage.tsx
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { ArrowRight, Minus, Plus, ShoppingCart } from 'lucide-react'
// استيراد صفحة 404 (افترض وجودها)
import { NotFoundPage } from './NotFoundPage' // غير المسار حسب هيكل مشروعك

interface Product {
  id: string
  name: string
  description: string | null
  base_price: number
  image_url: string | null
  is_available: boolean
  category_id: string | null  // قد يكون null
  preparation_minutes: number | null
}

interface Size {
  id: string
  name: string
  price_adjustment: number
  is_default: boolean
}

interface AddonGroup {
  id: string
  name: string
  selection_type: 'single' | 'multiple'
  min_selection: number
  max_selection: number
  is_required: boolean
  options: AddonOption[]
}

interface AddonOption {
  id: string
  name: string
  price: number
  is_active: boolean
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [sizes, setSizes] = useState<Size[]>([])
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)

  const calculatePrice = () => {
    if (!product) return 0
    let price = product.base_price
    const size = sizes.find(s => s.id === selectedSize)
    if (size) price += size.price_adjustment
    Object.entries(selectedAddons).forEach(([groupId, optionIds]) => {
      const group = addonGroups.find(g => g.id === groupId)
      if (group) {
        optionIds.forEach(optId => {
          const opt = group.options.find(o => o.id === optId)
          if (opt) price += opt.price
        })
      }
    })
    return price * quantity
  }

  useEffect(() => {
    if (!productId || !supabase) return

    const fetchProduct = async () => {
      try {
        const { data: prod, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (prodError) throw prodError
        if (!prod) throw new Error('المنتج غير موجود')
        setProduct(prod)

        // جلب الأحجام
        const { data: sizeData, error: sizeError } = await supabase
          .from('product_sizes')
          .select('*')
          .eq('product_id', productId)
          .eq('is_active', true)
          .order('price_adjustment')

        if (sizeError) throw sizeError
        setSizes(sizeData || [])
        const defaultSize = sizeData?.find(s => s.is_default)
        if (defaultSize) setSelectedSize(defaultSize.id)
        else if (sizeData && sizeData.length > 0) setSelectedSize(sizeData[0].id)

        // جلب مجموعات الإضافات مع خياراتها
        const { data: groups, error: groupsError } = await supabase
          .from('product_addon_groups')
          .select(`
            addon_groups (
              id, name, selection_type, min_selection, max_selection, is_required,
              addon_options (id, name, price, is_active)
            )
          `)
          .eq('product_id', productId)

        if (groupsError) throw groupsError

        // تحويل البيانات: نأخذ addon_groups ونحولها إلى AddonGroup[]
        const parsedGroups: AddonGroup[] = (groups || [])
          .map((item: any) => item.addon_groups)
          .filter((g: any) => g !== null)
          .map((g: any) => ({
            ...g,
            options: g.addon_options || [] // إعادة تسمية addon_options إلى options
          }))

        setAddonGroups(parsedGroups)

        // تهيئة الاختيارات الافتراضية
        const defaultSelections: Record<string, string[]> = {}
        parsedGroups.forEach(group => {
          if (group.is_required && group.selection_type === 'single' && group.options.length > 0) {
            defaultSelections[group.id] = [group.options[0].id]
          } else {
            defaultSelections[group.id] = []
          }
        })
        setSelectedAddons(defaultSelections)
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل تفاصيل المنتج')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleAddonToggle = (groupId: string, optionId: string) => {
    setSelectedAddons(prev => {
      const current = prev[groupId] || []
      const group = addonGroups.find(g => g.id === groupId)
      if (!group) return prev

      if (group.selection_type === 'single') {
        return { ...prev, [groupId]: [optionId] }
      } else {
        const exists = current.includes(optionId)
        const newSelection = exists
          ? current.filter(id => id !== optionId)
          : [...current, optionId]
        return { ...prev, [groupId]: newSelection }
      }
    })
  }

  const handleAddToCart = async () => {
    if (!session) {
      navigate('/login', { state: { from: `/product/${productId}` } })
      return
    }
    if (!product) return
    if (!supabase) {
      setError('خطأ في الاتصال بقاعدة البيانات')
      return
    }

    if (sizes.length > 0 && !selectedSize) {
      setError('الرجاء اختيار الحجم')
      return
    }

    for (const group of addonGroups) {
      if (group.is_required) {
        const selected = selectedAddons[group.id] || []
        if (selected.length < group.min_selection) {
          setError(`الرجاء اختيار ${group.name} (${group.min_selection} على الأقل)`)
          return
        }
        if (selected.length > group.max_selection) {
          setError(`لا يمكن اختيار أكثر من ${group.max_selection} من ${group.name}`)
          return
        }
      }
    }

    setError(null)
    setAddingToCart(true)

    try {
      // 1. البحث عن سلة مفتوحة
      let { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'open')
        .maybeSingle()

      if (cartError) throw cartError

      if (!cart) {
        const { data: newCart, error: newCartError } = await supabase
          .from('carts')
          .insert({ user_id: session.user.id, status: 'open' })
          .select('id')
          .single()

        if (newCartError) throw newCartError
        cart = newCart
      }

      const price = calculatePrice() / quantity
      const { error: itemError } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: product.id,
          size_id: selectedSize,
          quantity: quantity,
          unit_price: price,
          notes: '',
        })

      if (itemError) throw itemError

      // جلب العنصر المضاف حديثاً
      const { data: cartItem, error: cartItemError } = await supabase
        .from('cart_items')
        .select('id')
        .eq('cart_id', cart.id)
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cartItemError) throw cartItemError

      if (cartItem) {
        const addonInserts = Object.entries(selectedAddons).flatMap(([groupId, optionIds]) =>
          optionIds.map(optId => ({
            cart_item_id: cartItem.id,
            addon_option_id: optId,
          }))
        )
        if (addonInserts.length > 0) {
          const { error: addonError } = await supabase
            .from('cart_item_addons')
            .insert(addonInserts)
          if (addonError) throw addonError
        }
      }

      setSuccess('تمت إضافة المنتج إلى السلة')
      setTimeout(() => navigate('/cart'), 1000)
    } catch (err) {
      console.error(err)
      setError('تعذرت إضافة المنتج إلى السلة')
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) return <PageLoader label="جاري تحميل المنتج..." />
  if (error && !product) return <div className="p-4 text-center text-red-600">{error}</div>
  if (!product) return <NotFoundPage />

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4 py-4">
          <Link to="/menu" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="text-xl font-black text-vibes-900">تفاصيل المنتج</h1>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="aspect-video w-full bg-vibes-100">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-vibes-300">☕</div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-vibes-900">{product.name}</h2>
          {product.description && <p className="mt-1 text-sm text-vibes-600">{product.description}</p>}
          <p className="mt-3 text-2xl font-black text-vibes-800">{calculatePrice()} ريال</p>
          {product.preparation_minutes && (
            <p className="mt-1 text-sm text-vibues-500">⏱️ وقت التحضير: {product.preparation_minutes} دقيقة</p>
          )}
          {!product.is_available && (
            <Alert type="error" className="mt-3">هذا المنتج غير متوفر حالياً</Alert>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="font-bold text-vibes-900">اختر الحجم</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                    selectedSize === size.id
                      ? 'bg-vibes-800 text-white'
                      : 'bg-vibes-100 text-vibes-700'
                  }`}
                >
                  {size.name} {size.price_adjustment > 0 ? `+${size.price_adjustment}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {addonGroups.map(group => (
          <div key={group.id} className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="font-bold text-vibes-900">
              {group.name}
              {group.is_required && <span className="mr-1 text-red-500">*</span>}
            </h3>
            <p className="text-xs text-vibes-500">
              {group.selection_type === 'single' ? 'اختر واحداً' : `اختر ${group.min_selection} إلى ${group.max_selection}`}
            </p>
            <div className="mt-2 space-y-2">
              {group.options.filter(o => o.is_active).map(option => {
                const isSelected = (selectedAddons[group.id] || []).includes(option.id)
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAddonToggle(group.id, option.id)}
                    className={`flex w-full items-center justify-between rounded-xl p-3 transition ${
                      isSelected ? 'bg-vibes-100 border border-vibes-600' : 'bg-vibes-50'
                    }`}
                  >
                    <span className="text-sm font-medium text-vibes-900">{option.name}</span>
                    <span className="text-sm font-bold text-vibes-700">
                      {option.price > 0 ? `+${option.price}` : 'مجاني'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center rounded-2xl bg-white shadow-sm">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="p-3 text-vibes-700"
              aria-label="تقليل الكمية"
            >
              <Minus className="size-5" />
            </button>
            <span className="w-12 text-center text-xl font-black text-vibes-900">{quantity}</span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="p-3 text-vibes-700"
              aria-label="زيادة الكمية"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!product.is_available || addingToCart}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-vibes-800 py-3.5 font-bold text-white transition hover:bg-vibes-700 disabled:opacity-50"
          >
            {addingToCart ? (
              <>جاري الإضافة...</>
            ) : (
              <>
                <ShoppingCart className="size-5" />
                أضف إلى السلة
              </>
            )}
          </button>
        </div>

        {error && <div className="mt-3"><Alert type="error">{error}</Alert></div>}
        {success && <div className="mt-3"><Alert type="success">{success}</Alert></div>}
      </div>
    </main>
  )
}
