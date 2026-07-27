// src/pages/CarManagementPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import { ArrowRight, Car, Plus, Trash2, Edit, Check } from 'lucide-react'

interface Car {
  id: string
  name: string
  make: string
  model: string
  color: string
  plate_number: string
  is_default: boolean
}

export function CarManagementPage() {
  const { session } = useAuth()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    color: '',
    plate_number: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!session) return

    const fetchCars = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_cars')
          .select('*')
          .eq('user_id', session.user.id)
          .order('is_default', { ascending: false })

        if (error) throw error
        setCars(data || [])
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل السيارات')
      } finally {
        setLoading(false)
      }
    }

    fetchCars()
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        user_id: session.user.id,
        is_default: editingId ? undefined : cars.length === 0, // أول سيارة تصبح افتراضية
      }

      if (editingId) {
        const { error } = await supabase
          .from('customer_cars')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('customer_cars')
          .insert(payload)
        if (error) throw error
      }

      // تحديث القائمة
      const { data, error: fetchError } = await supabase
        .from('customer_cars')
        .select('*')
        .eq('user_id', session.user.id)

      if (fetchError) throw fetchError
      setCars(data || [])
      resetForm()
    } catch (err) {
      console.error(err)
      setError('تعذر حفظ السيارة')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', make: '', model: '', color: '', plate_number: '' })
  }

  const editCar = (car: Car) => {
    setEditingId(car.id)
    setFormData({
      name: car.name,
      make: car.make,
      model: car.model,
      color: car.color,
      plate_number: car.plate_number,
    })
    setShowForm(true)
  }

  const deleteCar = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف السيارة؟')) return
    try {
      const { error } = await supabase
        .from('customer_cars')
        .delete()
        .eq('id', id)
      if (error) throw error
      setCars(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
      setError('تعذر حذف السيارة')
    }
  }

  const setDefaultCar = async (id: string) => {
    try {
      // تعيين جميع السيارات إلى غير افتراضية ثم تعيين المختارة
      await supabase
        .from('customer_cars')
        .update({ is_default: false })
        .eq('user_id', session?.user.id)

      const { error } = await supabase
        .from('customer_cars')
        .update({ is_default: true })
        .eq('id', id)

      if (error) throw error
      setCars(prev => prev.map(c => ({ ...c, is_default: c.id === id })))
    } catch (err) {
      console.error(err)
      setError('تعذر تعيين السيارة الافتراضية')
    }
  }

  if (loading) return <PageLoader label="جاري تحميل السيارات..." />

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/account" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">سياراتي</h1>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', make: '', model: '', color: '', plate_number: '' }) }}
            className="rounded-full bg-vibes-800 p-2 text-white"
          >
            <Plus className="size-5" />
          </button>
        </header>

        {error && <Alert type="error">{error}</Alert>}

        {/* نموذج الإضافة/التعديل */}
        {showForm && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">{editingId ? 'تعديل سيارة' : 'إضافة سيارة جديدة'}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="اسم السيارة (مثل: تويوتا كامري)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="الماركة"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="الموديل"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="اللون"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="رقم اللوحة"
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                className="w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                required
              />
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="flex-1 rounded-2xl bg-vibes-800 py-3 font-bold text-white disabled:opacity-50">
                  {submitting ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" onClick={resetForm} className="rounded-2xl bg-vibes-100 px-6 py-3 font-bold text-vibes-700">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* قائمة السيارات */}
        <div className="mt-6 space-y-4">
          {cars.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <Car className="mx-auto size-16 text-vibes-300" />
              <p className="mt-4 font-bold text-vibes-900">لا توجد سيارات</p>
              <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', make: '', model: '', color: '', plate_number: '' }) }} className="mt-4 rounded-full bg-vibes-800 px-6 py-2.5 font-bold text-white">
                أضف سيارة
              </button>
            </div>
          ) : (
            cars.map(car => (
              <div key={car.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-vibes-100 flex items-center justify-center text-vibes-700">
                      <Car className="size-6" />
                    </div>
                    <div>
                      <p className="font-bold text-vibes-900">{car.name}</p>
                      <p className="text-sm text-vibes-600">{car.make} {car.model} • {car.color}</p>
                      <p className="text-sm text-vibes-600">لوحة: {car.plate_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {car.is_default && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">افتراضي</span>}
                    {!car.is_default && (
                      <button onClick={() => setDefaultCar(car.id)} className="text-xs text-vibes-600 underline">
                        تعيين افتراضي
                      </button>
                    )}
                    <button onClick={() => editCar(car)} className="p-1 text-vibes-600">
                      <Edit className="size-4" />
                    </button>
                    <button onClick={() => deleteCar(car.id)} className="p-1 text-red-500">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
