// src/pages/admin/AdminStickersPage.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  AdminHeader,
  AdminNotice,
  EmptyState,
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from './AdminUi'

interface Sticker {
  id: string
  name: string
  image_url: string
  storage_path: string | null
  category: string | null
  is_active: boolean
  is_vip_only: boolean
  required_achievement_id: string | null
  sort_order: number
}

interface StickerForm {
  name: string
  category: string
  sort_order: string
  is_active: boolean
  is_vip_only: boolean
  required_achievement_id: string
}

const EMPTY_FORM: StickerForm = {
  name: '',
  category: '',
  sort_order: '0',
  is_active: true,
  is_vip_only: false,
  required_achievement_id: '',
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function extensionFor(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  return 'webp'
}

export function AdminStickersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Sticker[]>([])
  const [form, setForm] = useState<StickerForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const editingSticker = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [editingId, items],
  )

  const load = async () => {
    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: loadError } = await client
      .from('stickers_library')
      .select(
        'id, name, image_url, storage_path, category, is_active, is_vip_only, required_achievement_id, sort_order',
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (loadError) setError(loadError.message)
    else setItems(data ?? [])

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectFile = (file: File | undefined) => {
    setError(null)
    setSuccess(null)
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('اختر صورة PNG أو JPEG أو WebP فقط.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('حجم الملصق لازم يكون 5MB أو أقل.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const startEdit = (sticker: Sticker) => {
    resetForm()
    setEditingId(sticker.id)
    setForm({
      name: sticker.name,
      category: sticker.category ?? '',
      sort_order: String(sticker.sort_order),
      is_active: sticker.is_active,
      is_vip_only: sticker.is_vip_only,
      required_achievement_id: sticker.required_achievement_id ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()

    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      return
    }

    if (!form.name.trim()) {
      setError('اسم الملصق مطلوب.')
      return
    }

    if (!editingId && !selectedFile) {
      setError('اختر صورة الملصق قبل الإضافة.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    let uploadedPath: string | null = null

    try {
      let imageUrl = editingSticker?.image_url ?? ''
      let storagePath = editingSticker?.storage_path ?? null

      if (selectedFile) {
        uploadedPath = `official/${crypto.randomUUID()}.${extensionFor(selectedFile)}`
        const { error: uploadError } = await client.storage
          .from('official-stickers')
          .upload(uploadedPath, selectedFile, {
            upsert: false,
            contentType: selectedFile.type,
            cacheControl: '31536000',
          })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = client.storage
          .from('official-stickers')
          .getPublicUrl(uploadedPath)

        imageUrl = publicUrlData.publicUrl
        storagePath = uploadedPath
      }

      const payload = {
        name: form.name.trim(),
        image_url: imageUrl,
        storage_path: storagePath,
        category: form.category.trim() || null,
        is_active: form.is_active,
        is_vip_only: form.is_vip_only,
        required_achievement_id: form.required_achievement_id.trim() || null,
        sort_order: Number.isFinite(Number(form.sort_order)) ? Number(form.sort_order) : 0,
      }

      if (editingId) {
        const { error: updateError } = await client
          .from('stickers_library')
          .update(payload)
          .eq('id', editingId)

        if (updateError) throw updateError

        if (
          uploadedPath &&
          editingSticker?.storage_path &&
          editingSticker.storage_path !== uploadedPath
        ) {
          void client.storage
            .from('official-stickers')
            .remove([editingSticker.storage_path])
            .then(({ error: cleanupError }) => {
              if (cleanupError && import.meta.env.DEV) console.warn(cleanupError)
            })
        }

        setSuccess('تم تحديث الملصق بنجاح.')
      } else {
        const { error: insertError } = await client.from('stickers_library').insert(payload)
        if (insertError) throw insertError
        setSuccess('تمت إضافة الملصق بنجاح.')
      }

      resetForm()
      await load()
    } catch (err: unknown) {
      if (uploadedPath) {
        void client.storage.from('official-stickers').remove([uploadedPath])
      }

      if (import.meta.env.DEV) console.error(err)
      setError(err instanceof Error ? err.message : 'تعذر حفظ الملصق.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (sticker: Sticker) => {
    const client = supabase
    if (!client) return

    setError(null)
    const { error: updateError } = await client
      .from('stickers_library')
      .update({ is_active: !sticker.is_active })
      .eq('id', sticker.id)

    if (updateError) setError(updateError.message)
    else await load()
  }

  const remove = async (sticker: Sticker) => {
    if (!window.confirm(`حذف ملصق "${sticker.name}" نهائياً؟`)) return

    const client = supabase
    if (!client) return

    setError(null)
    setSuccess(null)

    const { error: deleteError } = await client
      .from('stickers_library')
      .delete()
      .eq('id', sticker.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    if (sticker.storage_path) {
      const { error: storageError } = await client.storage
        .from('official-stickers')
        .remove([sticker.storage_path])

      if (storageError && import.meta.env.DEV) console.warn(storageError)
    }

    if (editingId === sticker.id) resetForm()
    setSuccess('تم حذف الملصق.')
    await load()
  }

  return (
    <section className="p-4 sm:p-6">
      <AdminHeader
        title="إدارة ملصقات فايبز"
        description="ارفع الملصقات الرسمية، صنّفها، رتّبها، وحدد الملصقات الخاصة بأعضاء VIP."
      />

      <AdminNotice error={error} success={success} />

      <form
        onSubmit={(event) => void save(event)}
        className="mt-5 grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4"
      >
        <label>
          <span className={labelClass}>اسم الملصق</span>
          <input
            className={inputClass}
            value={form.name}
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="مثال: كوب فايبز"
          />
        </label>

        <label>
          <span className={labelClass}>التصنيف</span>
          <input
            className={inputClass}
            value={form.category}
            maxLength={60}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            placeholder="قهوة، صيف، مناسبات..."
          />
        </label>

        <label>
          <span className={labelClass}>ترتيب الظهور</span>
          <input
            type="number"
            className={inputClass}
            value={form.sort_order}
            onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
          />
        </label>

        <label>
          <span className={labelClass}>معرّف الإنجاز المطلوب (اختياري)</span>
          <input
            dir="ltr"
            className={inputClass}
            value={form.required_achievement_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, required_achievement_id: event.target.value }))
            }
            placeholder="UUID"
          />
        </label>

        <div className="md:col-span-2 xl:col-span-4">
          <span className={labelClass}>صورة الملصق</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-28 w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-vibes-300 bg-vibes-50 px-4 font-black text-vibes-800"
          >
            {previewUrl || editingSticker?.image_url ? (
              <img
                src={previewUrl || editingSticker?.image_url}
                alt="معاينة الملصق"
                className="size-24 object-contain"
              />
            ) : (
              <ImagePlus className="size-7" />
            )}
            <span>{selectedFile ? selectedFile.name : 'اختر صورة حتى 5MB'}</span>
          </button>
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-vibes-50 p-4">
          <input
            type="checkbox"
            className="size-5 accent-vibes-700"
            checked={form.is_active}
            onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
          />
          <span className="font-bold text-vibes-900">الملصق مفعّل</span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-vibes-50 p-4">
          <input
            type="checkbox"
            className="size-5 accent-vibes-700"
            checked={form.is_vip_only}
            onChange={(event) => setForm((current) => ({ ...current, is_vip_only: event.target.checked }))}
          />
          <span className="font-bold text-vibes-900">خاص بأعضاء VIP</span>
        </label>

        <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
          <button className={primaryButtonClass} disabled={saving}>
            {saving ? (
              <LoaderCircle className="ml-2 inline size-4 animate-spin" />
            ) : editingId ? (
              <Save className="ml-2 inline size-4" />
            ) : (
              <Plus className="ml-2 inline size-4" />
            )}
            {editingId ? 'حفظ التعديلات' : 'إضافة الملصق'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-vibes-200 px-5 py-3 font-black text-vibes-800"
            >
              <X className="ml-2 inline size-4" />
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="grid min-h-40 place-items-center rounded-3xl bg-white sm:col-span-2 xl:col-span-3">
            <LoaderCircle className="size-7 animate-spin text-vibes-700" />
          </div>
        ) : items.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState>ما فيه ملصقات رسمية إلى الآن.</EmptyState>
          </div>
        ) : (
          items.map((sticker) => (
            <article key={sticker.id} className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-vibes-50 p-2">
                  <img src={sticker.image_url} className="size-full object-contain" alt={sticker.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-black text-vibes-900">{sticker.name}</h3>
                    {!sticker.is_active && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                        موقوف
                      </span>
                    )}
                    {sticker.is_vip_only && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-vibes-600">{sticker.category || 'عام'}</p>
                  <p className="mt-1 text-xs text-vibes-500">الترتيب: {sticker.sort_order}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="rounded-2xl border border-vibes-200 px-3 py-2 text-sm font-black text-vibes-800"
                  onClick={() => startEdit(sticker)}
                >
                  <Pencil className="mx-auto size-4" />
                  <span className="mt-1 block">تعديل</span>
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-vibes-200 px-3 py-2 text-sm font-black text-vibes-800"
                  onClick={() => void toggleActive(sticker)}
                >
                  <Power className="mx-auto size-4" />
                  <span className="mt-1 block">{sticker.is_active ? 'إيقاف' : 'تفعيل'}</span>
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  onClick={() => void remove(sticker)}
                >
                  <Trash2 className="mx-auto size-4" />
                  <span className="mt-1 block">حذف</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
