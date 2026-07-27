// src/pages/MenuPage.tsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageLoader } from '../components/PageLoader'
import { ArrowRight, Search, Filter } from 'lucide-react'

interface Category {
  id: string
  name: string
  image_url: string | null
}

interface Product {
  id: string
  name: string
  description: string | null
  base_price: number
  image_url: string | null
  is_available: boolean
  category_id: string
}

export function MenuPage() {
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب التصنيفات النشطة
        const { data: cats, error: catsError } = await supabase
          .from('menu_categories')
          .select('id, name, image_url')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (catsError) throw catsError
        setCategories(cats || [])

        // جلب المنتجات
        let query = supabase
          .from('products')
          .select('id, name, description, base_price, image_url, is_available, category_id')
          .eq('is_active', true)

        if (categoryFilter) {
          // نبحث عن التصنيف الذي يحمل نفس الاسم
          const matchedCat = cats?.find(c => c.name === categoryFilter)
          if (matchedCat) {
            query = query.eq('category_id', matchedCat.id)
            setSelectedCategory(matchedCat.id)
          }
        }

        const { data: prods, error: prodsError } = await query
        if (prodsError) throw prodsError
        setProducts(prods || [])
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل المنيو')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [categoryFilter])

  // تصفية حسب التصنيف المختار
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  if (loading) return <PageLoader label="جاري تحميل المنيو..." />
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/home" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">المنيو</h1>
          <button className="rounded-full bg-white p-2 shadow" aria-label="بحث">
            <Search className="size-5 text-vibes-700" />
          </button>
        </header>

        {/* تصفية التصنيفات */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
              !selectedCategory ? 'bg-vibes-800 text-white' : 'bg-white text-vibes-700'
            }`}
          >
            الكل
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id ? 'bg-vibes-800 text-white' : 'bg-white text-vibes-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* قائمة المنتجات */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map(product => (
            <Link key={product.id} to={`/product/${product.id}`} className="group rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
              <div className="relative h-32 overflow-hidden rounded-xl bg-vibes-100">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-vibes-100 text-vibes-400 text-4xl">☕</div>
                )}
                {!product.is_available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-bold">
                    غير متوفر
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-vibes-900 line-clamp-1">{product.name}</p>
                  <p className="text-sm text-vibes-600">{product.base_price} ريال</p>
                </div>
                {product.is_available && (
                  <span className="rounded-full bg-vibes-100 px-2 py-0.5 text-xs font-bold text-vibes-700">+</span>
                )}
              </div>
            </Link>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-vibes-600">
              <p className="text-xl">😕</p>
              <p className="mt-2">لا توجد منتجات في هذا التصنيف</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
