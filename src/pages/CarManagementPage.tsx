// src/pages/CarManagementPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Car, Edit, Plus, Trash2 } from 'lucide-react'
import { Alert } from '../components/Alert'
import { PageLoader } from '../components/PageLoader'
import { useAuth } from '../features/auth/useAuth'
import { supabase } from '../lib/supabase'
import type { CustomerCar } from '../types/database'

const emptyForm = {
  name: '',
  make: '',
  model: '',
  color: '',
  plate_number: '',
}

export function CarManagementPage() {
  const { session } = useAuth()
  const [cars, setCars] = useState<CustomerCar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    const client = supabase

    if (!session) {
      setCars([])
      setLoading(false)

      return () => {
        active = false
      }
    }

    if (!client) {
      setError('خدمة Supabase غير متاحة حالياً')
      setLoading(false)

      return () => {
        active = false
      }
    }

    setLoading(true)
    setError(null)

    const fetchCars = async () => {
      try {
        const { data, error: requestError } = await client
          .from('customer_cars')
          .select('*')
          .eq('user_id', session.user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })

        if (requestError) throw requestError
        if (active) setCars(data ?? [])
      } catch (requestError) {
        if (import.meta.env.DEV) console.error(requestError)
        if (active) setError('تعذر تحميل السيارات')
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchCars()

    return () => {
      active = false
    }
  }, [session])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const openAddForm = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const editCar = (car: CustomerCar) => {
    setEditingId(car.id)
    setFormData({
      name: car.name,
      make: car.make ?? '',
      model: car.model ?? '',
      color: car.color ?? '',
      plate_number: car.plate_number ?? '',
    })
    setError(null)
    setShowForm(true)
  }

  const refreshCars = async () => {
    const client = supabase

    if (!session || !client) {
      throw new Error('Supabase is not configured')
    }

    const { data, error: requestError } = await client
      .from('customer_cars')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (requestError) throw requestError
    setCars(data ?? [])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const client = supabase

    if (!session) {
      setError('سجّل الدخول أولاً لإدارة سياراتك')
      return
    }

    if (!client) {
      setError('خدمة Supabase غير متاحة حالياً')
      return
    }

    const name = formData.name.trim()
    const make = formData.make.trim()
    const model = formData.model.trim()
    const color = formData.color.trim()
    const plateNumber = formData.plate_number.trim()

    if (!name || !make || !model || !color || !plateNumber) {
      setError('عبّ جميع بيانات السيارة')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const carData = {
        name,
        make,
        model,
        color,
        plate_number: plateNumber,
      }

      if (editingId) {
        const { error: updateError } = await client
          .from('customer_cars')
          .update(carData)
          .eq('id', editingId)
          .eq('user_id', session.user.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await client
          .from('customer_cars')
          .insert({
            ...carData,
            user_id: session.user.id,
            is_default: cars.length === 0,
          })

        if (insertError) throw insertError
      }

      await refreshCars()
      resetForm()
    } catch (requestError) {
      if (import.meta.env.DEV) console.error(requestError)
      setError('تعذر حفظ السيارة')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteCar = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف السيارة؟')) return

    const client = supabase

    if (!session) {
      setError('سجّل الدخول أولاً لإدارة سياراتك')
      return
    }

    if (!client) {
      setError('خدمة Supabase غير متاحة حالياً')
      return
    }

    setError(null)

    try {
      const deletedCar = cars.find((car) => car.id === id)

      const { error: deleteError } = await client
        .from('customer_cars')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (deleteError) throw deleteError

      const remainingCars = cars.filter((car) => car.id !== id)
      setCars(remainingCars)

      if (deletedCar?.is_default && remainingCars.length > 0) {
        const nextDefaultId = remainingCars[0].id

        const { error: defaultError } = await client
          .from('customer_cars')
          .update({ is_default: true })
          .eq('id', nextDefaultId)
          .eq('user_id', session.user.id)

        if (defaultError) throw defaultError

        setCars((currentCars) =>
          currentCars.map((car) => ({
            ...car,
            is_default: car.id === nextDefaultId,
          })),
        )
      }
    } catch (requestError) {
      if (import.meta.env.DEV) console.error(requestError)
      setError('تعذر حذف السيارة')
      void refreshCars().catch(() => undefined)
    }
  }

  const setDefaultCar = async (id: string) => {
    const client = supabase

    if (!session) {
      setError('سجّل الدخول أولاً لإدارة سياراتك')
      return
    }

    if (!client) {
      setError('خدمة Supabase غير متاحة حالياً')
      return
    }

    setError(null)

    try {
      const { error: resetError } = await client
        .from('customer_cars')
        .update({ is_default: false })
        .eq('user_id', session.user.id)

      if (resetError) throw resetError

      const { error: defaultError } = await client
        .from('customer_cars')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (defaultError) throw defaultError

      setCars((currentCars) =>
        currentCars.map((car) => ({
          ...car,
          is_default: car.id === id,
        })),
      )
    } catch (requestError) {
      if (import.meta.env.DEV) console.error(requestError)
      setError('تعذر تعيين السيارة الافتراضية')
      void refreshCars().catch(() => undefined)
    }
  }

  if (loading) {
    return <PageLoader label="جاري تحميل السيارات..." />
  }

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/account" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>

          <h1 className="min-w-0 flex-1 text-2xl font-black text-vibes-900">
            سياراتي
          </h1>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-full bg-vibes-800 p-2 text-white"
            aria-label="إضافة سيارة"
          >
            <Plus className="size-5" />
          </button>
        </header>

        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {/* نموذج الإضافة/التعديل */}
        {showForm && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-vibes-900">
              {editingId ? 'تعديل سيارة' : 'إضافة سيارة جديدة'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="اسم السيارة (مثل: تويوتا كامري)"
                value={formData.name}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
                }
                className="w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                required
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="الماركة"
                  value={formData.make}
                  onChange={(event) =>
                    setFormData({ ...formData, make: event.target.value })
                  }
                  className="min-w-0 rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                  required
                />

                <input
                  type="text"
                  placeholder="الموديل"
                  value={formData.model}
                  onChange={(event) =>
                    setFormData({ ...formData, model: event.target.value })
                  }
                  className="min-w-0 rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                  required
                />
              </div>

              <input
                type="text"
                placeholder="اللون"
                value={formData.color}
                onChange={(event) =>
                  setFormData({ ...formData, color: event.target.value })
                }
                className="w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                required
              />

              <input
                type="text"
                placeholder="رقم اللوحة"
                value={formData.plate_number}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    plate_number: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-vibes-200 p-3 text-sm focus:border-vibes-600 focus:outline-none"
                required
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-2xl bg-vibes-800 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-2xl bg-vibes-100 px-6 py-3 font-bold text-vibes-700 disabled:opacity-50"
                >
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

              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 rounded-full bg-vibes-800 px-6 py-2.5 font-bold text-white"
              >
                أضف سيارة
              </button>
            </div>
          ) : (
            cars.map((car) => (
              <div
                key={car.id}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-vibes-100 text-vibes-700">
                      <Car className="size-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-vibes-900">
                        {car.name}
                      </p>
                      <p className="text-sm text-vibes-600">
                        {car.make || 'غير محدد'} {car.model || ''}
                        {car.color ? ` • ${car.color}` : ''}
                      </p>
                      <p className="text-sm text-vibes-600">
                        لوحة: {car.plate_number || 'غير محددة'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {car.is_default ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        افتراضي
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setDefaultCar(car.id)}
                        className="text-xs text-vibes-600 underline"
                      >
                        تعيين افتراضي
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => editCar(car)}
                      className="p-1 text-vibes-600"
                      aria-label={`تعديل ${car.name}`}
                    >
                      <Edit className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteCar(car.id)}
                      className="p-1 text-red-500"
                      aria-label={`حذف ${car.name}`}
                    >
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
