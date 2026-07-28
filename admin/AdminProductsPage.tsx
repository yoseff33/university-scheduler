import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit3, PackagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AdminHeader, AdminNotice, EmptyState, dangerButtonClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './AdminUi'

type Product = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  is_available: boolean
  is_active: boolean
  preparation_minutes: number
  sort_order: number
}

type Category = { id: string; name: string }

type ProductForm = {
  name: string
  category_id: string
  description: string
  image_url: string
  base_price: string
  preparation_minutes: string
  sort_order: string
  is_available: boolean
  is_active: boolean
}

const emptyForm: ProductForm = {
  name: '', category_id: '', description: '', image_url: '', base_price: '', preparation_minutes: '0', sort_order: '0', is_available: true, is_active: true,
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    const client = supabase
    if (!client) { setError('خدمة قاعدة البيانات غير مفعلة'); setLoading(false); return }
    setLoading(true); setError(null)
    const [{ data: productData, error: productError }, { data: categoryData, error: categoryError }] = await Promise.all([
      client.from('products').select('id, category_id, name, description, image_url, base_price, is_available, is_active, preparation_minutes, sort_order').order('sort_order').order('name'),
      client.from('menu_categories').select('id, name').order('name'),
    ])
    if (productError || categoryError) setError(productError?.message ?? categoryError?.message ?? 'تعذر تحميل البيانات')
    else { setProducts(productData ?? []); setCategories(categoryData ?? []) }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase())), [products, search])
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'بدون تصنيف'

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); setError(null); setSuccess(null) }
  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category_id: product.category_id ?? '',
      description: product.description ?? '',
      image_url: product.image_url ?? '',
      base_price: String(product.base_price),
      preparation_minutes: String(product.preparation_minutes),
      sort_order: String(product.sort_order),
      is_available: product.is_available,
      is_active: product.is_active,
    })
    setShowForm(true); setError(null); setSuccess(null)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const client = supabase
    if (!client) return
    const price = Number(form.base_price)
    if (!form.name.trim()) { setError('اسم المنتج مطلوب'); return }
    if (!Number.isFinite(price) || price < 0) { setError('أدخل سعرًا صحيحًا'); return }
    setSaving(true); setError(null); setSuccess(null)
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      base_price: price,
      preparation_minutes: Math.max(0, Number(form.preparation_minutes) || 0),
      sort_order: Number(form.sort_order) || 0,
      is_available: form.is_available,
      is_active: form.is_active,
    }
    const result = editingId
      ? await client.from('products').update(payload).eq('id', editingId)
      : await client.from('products').insert(payload)
    if (result.error) setError(result.error.message)
    else { setSuccess(editingId ? 'تم تعديل المنتج' : 'تمت إضافة المنتج'); setShowForm(false); setForm(emptyForm); setEditingId(null); await load() }
    setSaving(false)
  }

  const remove = async (product: Product) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج: ${product.name}؟`)) return
    const client = supabase
    if (!client) return
    const { error: deleteError } = await client.from('products').delete().eq('id', product.id)
    if (deleteError) setError(deleteError.message)
    else { setSuccess('تم حذف المنتج'); await load() }
  }

  return (
    <section className="p-4 sm:p-6">
      <AdminHeader title="إدارة المنتجات" description="أضف المنتجات وعدّل الأسعار والتوفر والتصنيفات." action={<button className={primaryButtonClass} onClick={openCreate}><Plus className="ml-2 inline size-4" />إضافة منتج</button>} />
      <AdminNotice error={error} success={success} />

      {showForm && (
        <form onSubmit={(e) => void save(e)} className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-vibes-900">{editingId ? 'تعديل المنتج' : 'منتج جديد'}</h2><button type="button" onClick={() => setShowForm(false)}><X className="size-5" /></button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>اسم المنتج *</span><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label><span className={labelClass}>التصنيف</span><select className={inputClass} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">بدون تصنيف</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label><span className={labelClass}>السعر *</span><input className={inputClass} type="number" min="0" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} /></label>
            <label><span className={labelClass}>وقت التحضير بالدقائق</span><input className={inputClass} type="number" min="0" value={form.preparation_minutes} onChange={(e) => setForm({ ...form, preparation_minutes: e.target.value })} /></label>
            <label className="md:col-span-2"><span className={labelClass}>رابط الصورة</span><input className={inputClass} dir="ltr" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></label>
            <label className="md:col-span-2"><span className={labelClass}>الوصف</span><textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label><span className={labelClass}>ترتيب العرض</span><input className={inputClass} type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></label>
            <div className="flex flex-wrap items-end gap-5 pb-2"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />متوفر للطلب</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />ظاهر في المنيو</label></div>
          </div>
          <div className="mt-5 flex gap-3"><button disabled={saving} className={primaryButtonClass}><Save className="ml-2 inline size-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button><button type="button" className={secondaryButtonClass} onClick={() => setShowForm(false)}>إلغاء</button></div>
        </form>
      )}

      <div className="mt-5"><input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المنتج..." /></div>
      <div className="mt-5 space-y-3">
        {loading ? <p className="text-center text-vibes-600">جاري التحميل...</p> : filtered.length === 0 ? <EmptyState><PackagePlus className="mx-auto mb-3 size-10" />ما فيه منتجات. اضغط «إضافة منتج».</EmptyState> : filtered.map((product) => (
          <article key={product.id} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-vibes-100">{product.image_url ? <img className="h-full w-full object-cover" src={product.image_url} alt={product.name} /> : <div className="flex h-full items-center justify-center text-3xl">☕</div>}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-vibes-900">{product.name}</h3>{!product.is_active && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">مخفي</span>}{!product.is_available && <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">غير متوفر</span>}</div><p className="text-sm text-vibes-600">{categoryName(product.category_id)} · {product.base_price} ريال · {product.preparation_minutes} دقيقة</p></div>
            <div className="flex gap-2"><button className={secondaryButtonClass} onClick={() => openEdit(product)}><Edit3 className="ml-1 inline size-4" />تعديل</button><button className={dangerButtonClass} onClick={() => void remove(product)}><Trash2 className="ml-1 inline size-4" />حذف</button></div>
          </article>
        ))}
      </div>
    </section>
  )
}
