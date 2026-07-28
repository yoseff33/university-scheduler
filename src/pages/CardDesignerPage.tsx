// src/pages/CardDesignerPage.tsx
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import type { Json } from '../types/database'

interface Sticker {
  id: string
  name: string
  image_url: string
}

interface PlacedSticker {
  id: string
  x: number
  y: number
  scale: number
  rotation: number
}

function parsePlacedSticker(value: Json): PlacedSticker | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const sticker = value as Record<string, unknown>
  if (
    typeof sticker.id !== 'string' ||
    typeof sticker.x !== 'number' ||
    typeof sticker.y !== 'number' ||
    typeof sticker.scale !== 'number' ||
    typeof sticker.rotation !== 'number'
  ) {
    return null
  }

  return {
    id: sticker.id,
    x: sticker.x,
    y: sticker.y,
    scale: sticker.scale,
    rotation: sticker.rotation,
  }
}

function readPlacedStickers(designData: Json): PlacedSticker[] {
  if (!designData || typeof designData !== 'object' || Array.isArray(designData)) {
    return []
  }

  const stickers = designData.stickers
  if (!Array.isArray(stickers)) return []

  return stickers
    .map(parsePlacedSticker)
    .filter((sticker): sticker is PlacedSticker => sticker !== null)
}

export function CardDesignerPage() {
  const { session } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [backgrounds, setBackgrounds] = useState<{ id: string; image_url: string }[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null)
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [bgRes, stickerRes] = await Promise.all([
          client.from('card_backgrounds').select('id, image_url').eq('is_active', true),
          client.from('card_stickers').select('id, name, image_url').eq('is_active', true),
        ])

        if (bgRes.error) throw bgRes.error
        if (stickerRes.error) throw stickerRes.error

        setBackgrounds(bgRes.data ?? [])
        setStickers(stickerRes.data ?? [])

        const { data: design, error: designError } = await client
          .from('customer_card_designs')
          .select('background_id, design_data')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (designError) throw designError
        if (design) {
          setSelectedBackground(design.background_id)
          setPlacedStickers(readPlacedStickers(design.design_data))
        }
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل بيانات المصمم')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [session])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = async () => {
      canvas.width = 400
      canvas.height = 640

      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (selectedBackground) {
        const bg = backgrounds.find((item) => item.id === selectedBackground)
        if (bg) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = bg.image_url
          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              resolve()
            }
            img.onerror = () => resolve()
          })
        }
      }

      for (const placedSticker of placedStickers) {
        const stickerData = stickers.find((item) => item.id === placedSticker.id)
        if (!stickerData) continue

        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = stickerData.image_url
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const size = 60 * placedSticker.scale
            ctx.save()
            ctx.translate(placedSticker.x, placedSticker.y)
            ctx.rotate((placedSticker.rotation * Math.PI) / 180)
            ctx.drawImage(img, -size / 2, -size / 2, size, size)
            ctx.restore()
            resolve()
          }
          img.onerror = () => resolve()
        })
      }

      ctx.fillStyle = '#3b1d2a'
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText('فايبز', 20, 40)
      ctx.font = '16px sans-serif'
      ctx.fillText('اسم العميل', 20, 600)
      ctx.fillText('رقم العضوية: 1234567', 20, 630)
    }

    void draw()
  }, [backgrounds, selectedBackground, placedStickers, stickers])

  const addSticker = (stickerId: string) => {
    setPlacedStickers((current) => [
      ...current,
      {
        id: stickerId,
        x: 200 + Math.random() * 100 - 50,
        y: 200 + Math.random() * 100 - 50,
        scale: 1,
        rotation: 0,
      },
    ])
  }

  const removeSticker = (index: number) => {
    setPlacedStickers((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const saveDesign = async () => {
    if (!session) return

    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const designData: Json = {
        stickers: placedStickers.map((sticker): Json => ({
          id: sticker.id,
          x: sticker.x,
          y: sticker.y,
          scale: sticker.scale,
          rotation: sticker.rotation,
        })),
      }

      const { data: existing, error: checkError } = await client
        .from('customer_card_designs')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (checkError) throw checkError

      if (existing) {
        const { error: updateError } = await client
          .from('customer_card_designs')
          .update({
            background_id: selectedBackground,
            design_data: designData,
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await client.from('customer_card_designs').insert({
          user_id: session.user.id,
          background_id: selectedBackground,
          design_data: designData,
          is_active: true,
        })

        if (insertError) throw insertError
      }

      setSuccess('تم حفظ التصميم بنجاح')
    } catch (err) {
      console.error(err)
      setError('تعذر حفظ التصميم')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader label="جاري تحميل المصمم..." />

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/loyalty" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">تخصيص بطاقة الولاء</h1>
          <button onClick={saveDesign} disabled={saving} className="rounded-full bg-vibes-800 p-2 text-white">
            {saving ? '...' : <Save className="size-5" />}
          </button>
        </header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <canvas ref={canvasRef} className="mx-auto w-full max-w-sm" />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-vibes-900">الخلفيات</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {backgrounds.map((background) => (
                  <button
                    key={background.id}
                    onClick={() => setSelectedBackground(background.id)}
                    className={`aspect-square rounded-xl border-2 p-1 transition ${
                      selectedBackground === background.id ? 'border-vibes-600' : 'border-transparent'
                    }`}
                  >
                    <img src={background.image_url} alt="خلفية" className="h-full w-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-vibes-900">الملصقات</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {stickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => addSticker(sticker.id)}
                    className="aspect-square rounded-xl border border-vibes-200 p-1 transition hover:shadow-md"
                  >
                    <img src={sticker.image_url} alt={sticker.name} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {placedStickers.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="font-bold text-vibes-900">الملصقات المضافة</h3>
                <div className="mt-3 space-y-2">
                  {placedStickers.map((placedSticker, index) => {
                    const sticker = stickers.find((item) => item.id === placedSticker.id)
                    return (
                      <div key={`${placedSticker.id}-${index}`} className="flex items-center justify-between rounded-xl bg-vibes-50 p-2">
                        <span className="text-sm">{sticker?.name ?? 'ملصق'}</span>
                        <button onClick={() => removeSticker(index)} className="text-red-500" aria-label="حذف الملصق">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
