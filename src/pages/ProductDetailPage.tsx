// src/pages/ProductDetailPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Minus, Plus, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { NotFoundPage } from './NotFoundPage'

interface Product {
  id: string
  name: string
  description: string | null
  base_price: number
  image_url: string | null
  is_available: boolean
  category_id: string | null
  preparation_minutes: number
}

interface Size {
  id: string
  name: string
  price_adjustment: number
  is_default: boolean
}

interface AddonOption {
  id: string
  name: string
  price: number
  is_active: boolean
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
    const size = sizes.find((item) => item.id === selectedSize)
    if (size) price += size.price_adjustment

    Object.entries(selectedAddons).forEach(([groupId, optionIds]) => {
      const group = addonGroups.find((item) => item.id === groupId)
      if (!group) return

      optionIds.forEach((optionId) => {
        const option = group.options.find((item) => item.id === optionId)
        if (option) price += option.price
      })
    })

    return price * quantity
  }

  useEffect(() => {
    if (!productId) {
      setLoading(false)
      return
    }

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      setLoading(false)
      return
    }

    const fetchProduct = async () => {
      try {
        const { data: productData, error: productError } = await client
          .from('products')
          .select('id, name, description, base_price, image_url, is_available, category_id, preparation_minutes')
          .eq('id', productId)
          .single()

        if (productError) throw productError
        if (!productData) throw new Error('المنتج غير موجود')
        setProduct(productData)

        const { data: sizeData, error: sizeError } = await client
          .from('product_sizes')
          .select('id, name, price_adjustment, is_default')
          .eq('product_id', productId)
          .eq('is_active', true)
          .order('price_adjustment')

        if (sizeError) throw sizeError

        const availableSizes = sizeData ?? []
        setSizes(availableSizes)
        const defaultSize = availableSizes.find((size) => size.is_default) ?? availableSizes[0]
        setSelectedSize(defaultSize?.id ?? null)

        const { data: groupsData, error: groupsError } = await client
          .from('product_addon_groups')
          .select(`
            addon_groups (
              id,
              name,
              selection_type,
              min_selection,
              max_selection,
              is_required,
              addon_options (id, name, price, is_active)
            )
          `)
          .eq('product_id', productId)

        if (groupsError) throw groupsError

        const parsedGroups: AddonGroup[] = (groupsData ?? []).flatMap((relation) => {
          const group = relation.addon_groups
          if (!group) return []

          return [{
            id: group.id,
            name: group.name,
            selection_type: group.selection_type,
            min_selection: group.min_selection,
            max_selection: group.max_selection,
            is_required: group.is_required,
            options: group.addon_options ?? [],
          }]
        })

        setAddonGroups(parsedGroups)

        const defaultSelections: Record<string, string[]> = {}
        parsedGroups.forEach((group) => {
          const firstActiveOption = group.options.find((option) => option.is_active)
          if (group.is_required && group.selection_type === 'single' && firstActiveOption) {
            defaultSelections[group.id] = [firstActiveOption.id]
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

    void fetchProduct()
  }, [productId])

  const handleAddonToggle = (groupId: string, optionId: string) => {
    setSelectedAddons((currentSelections) => {
      const current = currentSelections[groupId] ?? []
      const group = addonGroups.find((item) => item.id === groupId)
      if (!group) return currentSelections

      if (group.selection_type === 'single') {
        return { ...currentSelections, [groupId]: [optionId] }
      }

      const exists = current.includes(optionId)
      if (!exists && current.length >= group.max_selection) {
        return currentSelections
      }

      const nextSelection = exists
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]

      return { ...currentSelections, [groupId]: nextSelection }
    })
  }

  const handleAddToCart = async () => {
    if (!session) {
      navigate('/login', { state: { from: `/product/${productId}` } })
      return
    }

    if (!product) return

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      return
    }

    if (sizes.length > 0 && !selectedSize) {
      setError('الرجاء اختيار الحجم')
      return
    }

    for (const group of addonGroups) {
      const selected = selectedAddons[group.id] ?? []
      if (selected.length < group.min_selection) {
        setError(`الرجاء اختيار ${group.name} (${group.min_selection} على الأقل)`)
        return
      }
      if (selected.length > group.max_selection) {
        setError(`لا يمكن اختيار أكثر من ${group.max_selection} من ${group.name}`)
        return
      }
    }

    setError(null)
    setSuccess(null)
    setAddingToCart(true)

    try {
      let { data: cart, error: cartError } = await client
        .from('carts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'open')
        .maybeSingle()

      if (cartError) throw cartError

      if (!cart) {
        const { data: newCart, error: newCartError } = await client
          .from('carts')
          .insert({ user_id: session.user.id, status: 'open' })
          .select('id')
          .single()

        if (newCartError) throw newCartError
        if (!newCart) throw new Error('تعذر إنشاء السلة')
        cart = newCart
      }

      const unitPrice = calculatePrice() / quantity
      const { data: cartItem, error: itemError } = await client
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: product.id,
          size_id: selectedSize,
          quantity,
          unit_price: unitPrice,
          notes: null,
        })
        .select('id')
        .single()

      if (itemError) throw itemError
      if (!cartItem) throw new Error('تعذر إضافة المنتج إلى السلة')

      const addonInserts = Object.values(selectedAddons).flatMap((optionIds) =>
        optionIds.map((optionId) => ({
          cart_item_id: cartItem.id,
          addon_option_id: optionId,
        })),
      )

      if (addonInserts.length > 0) {
        const { error: addonError } = await client
          .from('cart_item_addons')
          .insert(addonInserts)

        if (addonError) throw addonError
      }

      setSuccess('تمت إضافة المنتج إلى السلة')
      window.setTimeout(() => navigate('/cart'), 1000)
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
          {product.preparation_minutes > 0 && (
            <p className="mt-1 text-sm text-vibes-500">⏱️ وقت التحضير: {product.preparation_minutes} دقيقة</p>
          )}
          {!product.is_available && (
            <Alert type="error" className="mt-3">هذا المنتج غير متوفر حالياً</Alert>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="font-bold text-vibes-900">اختر الحجم</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                    selectedSize === size.id ? 'bg-vibes-800 text-white' : 'bg-vibes-100 text-vibes-700'
                  }`}
                >
                  {size.name} {size.price_adjustment > 0 ? `+${size.price_adjustment}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {addonGroups.map((group) => (
          <div key={group.id} className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="font-bold text-vibes-900">
              {group.name}
              {group.is_required && <span className="mr-1 text-red-500">*</span>}
            </h3>
            <p className="text-xs text-vibes-500">
              {group.selection_type === 'single' ? 'اختر واحداً' : `اختر ${group.min_selection} إلى ${group.max_selection}`}
            </p>
            <div className="mt-2 space-y-2">
              {group.options.filter((option) => option.is_active).map((option) => {
                const isSelected = (selectedAddons[group.id] ?? []).includes(option.id)
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAddonToggle(group.id, option.id)}
                    className={`flex w-full items-center justify-between rounded-xl p-3 transition ${
                      isSelected ? 'border border-vibes-600 bg-vibes-100' : 'bg-vibes-50'
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
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              className="p-3 text-vibes-700"
              aria-label="تقليل الكمية"
            >
              <Minus className="size-5" />
            </button>
            <span className="w-12 text-center text-xl font-black text-vibes-900">{quantity}</span>
            <button
              onClick={() => setQuantity((current) => current + 1)}
              className="p-3 text-vibes-700"
              aria-label="زيادة الكمية"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <button
            onClick={() => void handleAddToCart()}
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

        {error && <Alert type="error" className="mt-3">{error}</Alert>}
        {success && <Alert type="success" className="mt-3">{success}</Alert>}
      </div>
    </main>
  )
}
