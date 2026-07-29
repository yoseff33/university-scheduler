// src/pages/CardDesignerPage.tsx
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Save, Trash2, Download, RotateCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import * as fabric from 'fabric'
import type { Json } from '../types/database'

interface Sticker {
  id: string
  name: string
  image_url: string
}

interface Background {
  id: string
  image_url: string
}

interface PlacedSticker {
  id: string
  x: number
  y: number
  scale: number
  rotation: number
}

// دوال مساعدة للتحويل من Json إلى PlacedSticker[]
function parsePlacedSticker(value: Json): PlacedSticker | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>
  if (
    typeof obj.id !== 'string' ||
    typeof obj.x !== 'number' ||
    typeof obj.y !== 'number' ||
    typeof obj.scale !== 'number' ||
    typeof obj.rotation !== 'number'
  ) {
    return null
  }
  return {
    id: obj.id,
    x: obj.x,
    y: obj.y,
    scale: obj.scale,
    rotation: obj.rotation,
  }
}

function readPlacedStickers(designData: Json): PlacedSticker[] {
  if (!designData || typeof designData !== 'object' || Array.isArray(designData)) {
    return []
  }
  const stickers = (designData as Record<string, unknown>).stickers
  if (!Array.isArray(stickers)) return []
  return stickers.map(parsePlacedSticker).filter((s): s is PlacedSticker => s !== null)
}

function toDesignJson(stickers: PlacedSticker[]): Json {
  return { stickers: stickers.map(s => ({ ...s })) }
}

export function CardDesignerPage() {
  const { session } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null)
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null)
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const userId = session?.user.id

  // تحميل البيانات
  useEffect(() => {
    if (!userId) return
    const client = supabase
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [bgRes, stickerRes, designRes] = await Promise.all([
          client.from('card_backgrounds').select('id, image_url').eq('is_active', true).order('sort_order'),
          client.from('card_stickers').select('id, name, image_url').eq('is_active', true).order('sort_order'),
          client.from('customer_card_designs').select('background_id, design_data').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        ])

        if (bgRes.error) throw bgRes.error
        if (stickerRes.error) throw stickerRes.error

        setBackgrounds(bgRes.data ?? [])
        setStickers(stickerRes.data ?? [])

        if (designRes.data) {
          setSelectedBackground(designRes.data.background_id)
          const stickersData = readPlacedStickers(designRes.data.design_data)
          setPlacedStickers(stickersData)
        }
      } catch (err) {
        console.error(err)
        setError('تعذر تحميل بيانات المصمم')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  // تهيئة Fabric Canvas
  useEffect(() => {
    if (loading || !canvasRef.current) return
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 400,
      height: 640,
      backgroundColor: '#ffffff',
      selection: false,
    })
    setFabricCanvas(canvas)

    return () => {
      canvas.dispose()
    }
  }, [loading])

  // تحميل الخلفية والملصقات على الكانفاس
  useEffect(() => {
    if (!fabricCanvas || loading) return

    const loadDesign = async () => {
      fabricCanvas.clear()
      fabricCanvas.backgroundColor = '#ffffff'

      // خلفية
      if (selectedBackground) {
        const bg = backgrounds.find(b => b.id === selectedBackground)
        if (bg) {
          fabric.Image.fromURL(bg.image_url, (img: fabric.Image) => {
            img.set({
              left: 0,
              top: 0,
              width: 400,
              height: 640,
              scaleX: 400 / (img.width || 400),
              scaleY: 640 / (img.height || 640),
              selectable: false,
              evented: false,
            })
            fabricCanvas.add(img)
            fabricCanvas.sendToBack(img)
            fabricCanvas.renderAll()
          }, { crossOrigin: 'anonymous' })
        }
      }

      // إعادة الملصقات المحفوظة
      for (const ps of placedStickers) {
        const stickerData = stickers.find(s => s.id === ps.id)
        if (!stickerData) continue
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(stickerData.image_url, (img: fabric.Image) => {
            img.set({
              left: ps.x - 30 * ps.scale,
              top: ps.y - 30 * ps.scale,
              scaleX: ps.scale,
              scaleY: ps.scale,
              angle: ps.rotation,
              originX: 'center',
              originY: 'center',
              selectable: true,
              hasControls: true,
              hasBorders: true,
            })
            fabricCanvas.add(img)
            resolve()
          }, { crossOrigin: 'anonymous' })
        })
      }
      fabricCanvas.renderAll()
    }

    loadDesign()
  }, [fabricCanvas, selectedBackground, backgrounds, placedStickers, stickers, loading])

  // دالة لإضافة ملصق جديد
  const addSticker = (stickerId: string) => {
    if (!fabricCanvas) return
    const sticker = stickers.find(s => s.id === stickerId)
    if (!sticker) return

    fabric.Image.fromURL(sticker.image_url, (img: fabric.Image) => {
      img.set({
        left: 200,
        top: 320,
        scaleX: 0.5,
        scaleY: 0.5,
        angle: 0,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
      })
      fabricCanvas.add(img)
      fabricCanvas.setActiveObject(img)
      fabricCanvas.renderAll()
    }, { crossOrigin: 'anonymous' })
  }

  // حذف العنصر المحدد
  const deleteSelected = () => {
    if (!fabricCanvas) return
    const activeObj = fabricCanvas.getActiveObject()
    if (activeObj) {
      fabricCanvas.remove(activeObj)
      fabricCanvas.renderAll()
    }
  }

  // تدوير العنصر المحدد
  const rotateSelected = () => {
    if (!fabricCanvas) return
    const activeObj = fabricCanvas.getActiveObject()
    if (activeObj) {
      activeObj.rotate((activeObj.angle || 0) + 15)
      fabricCanvas.renderAll()
    }
  }

  // حفظ التصميم (جمع مواقع الملصقات من الكانفاس)
  const saveDesign = async () => {
    if (!fabricCanvas || !userId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const objects = fabricCanvas.getObjects()
      const stickersData: PlacedSticker[] = []
      for (const obj of objects) {
        if (!obj.selectable) continue
        const src = (obj as fabric.Image).getSrc?.() || ''
        const sticker = stickers.find(s => s.image_url === src)
        if (!sticker) continue
        const center = obj.getCenterPoint()
        stickersData.push({
          id: sticker.id,
          x: center.x,
          y: center.y,
          scale: obj.scaleX || 1,
          rotation: obj.angle || 0,
        })
      }

      const designJson = toDesignJson(stickersData)

      const { data: existing, error: checkErr } = await supabase
        .from('customer_card_designs')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (checkErr) throw checkErr

      if (existing) {
        const { error: updateErr } = await supabase
          .from('customer_card_designs')
          .update({
            background_id: selectedBackground,
            design_data: designJson,
          })
          .eq('id', existing.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('customer_card_designs')
          .insert({
            user_id: userId,
            background_id: selectedBackground,
            design_data: designJson,
            is_active: true,
          })
        if (insertErr) throw insertErr
      }

      setSuccess('تم حفظ التصميم بنجاح')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'تعذر حفظ التصميم')
    } finally {
      setSaving(false)
    }
  }

  // تصدير الصورة
  const exportImage = () => {
    if (!fabricCanvas) return
    setExporting(true)
    try {
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        multiplier: 2,
      })
      const link = document.createElement('a')
      link.download = 'vibes-card.png'
      link.href = dataURL
      link.click()
    } catch (err) {
      console.error(err)
      setError('فشل تصدير الصورة')
    } finally {
      setExporting(false)
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
          <button
            onClick={saveDesign}
            disabled={saving}
            className="rounded-full bg-vibes-800 p-2 text-white transition hover:bg-vibes-700 disabled:opacity-50"
          >
            {saving ? <span className="text-sm">جاري...</span> : <Save className="size-5" />}
          </button>
        </header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <canvas ref={canvasRef} className="mx-auto w-full max-w-sm" />
          </div>

          <div className="space-y-6">
            {/* أدوات التحرير */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-vibes-900">أدوات التحرير</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={deleteSelected}
                  className="rounded-xl bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
                  title="حذف العنصر المحدد"
                >
                  <Trash2 className="size-5" />
                </button>
                <button
                  onClick={rotateSelected}
                  className="rounded-xl bg-blue-100 p-2 text-blue-600 transition hover:bg-blue-200"
                  title="تدوير العنصر المحدد"
                >
                  <RotateCw className="size-5" />
                </button>
                <button
                  onClick={exportImage}
                  disabled={exporting}
                  className="rounded-xl bg-green-100 p-2 text-green-600 transition hover:bg-green-200 disabled:opacity-50"
                  title="تصدير الصورة"
                >
                  <Download className="size-5" />
                </button>
              </div>
            </div>

            {/* الخلفيات */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-vibes-900">الخلفيات</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {backgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg.id)}
                    className={`aspect-square rounded-xl border-2 p-1 transition ${
                      selectedBackground === bg.id ? 'border-vibes-600' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={bg.image_url}
                      alt="خلفية"
                      className="h-full w-full rounded-lg object-cover"
                      crossOrigin="anonymous"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* الملصقات */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-vibes-900">الملصقات</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {stickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => addSticker(sticker.id)}
                    className="aspect-square rounded-xl border border-vibes-200 p-1 transition hover:shadow-md"
                  >
                    <img
                      src={sticker.image_url}
                      alt={sticker.name}
                      className="h-full w-full object-contain"
                      crossOrigin="anonymous"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
