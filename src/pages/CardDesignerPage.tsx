// src/pages/CardDesignerPage.tsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Save, Trash2, Download, RotateCw, Maximize, Minimize, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/useAuth';
import { PageLoader } from '../components/PageLoader';
import { Alert } from '../components/Alert';
import { fabric } from 'fabric';
import html2canvas from 'html2canvas';

interface Sticker {
  id: string;
  name: string;
  image_url: string;
}

interface PlacedSticker {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// المناطق المحمية (مستطيلات)
const PROTECTED_ZONES = [
  { x: 20, y: 20, width: 100, height: 40 }, // الشعار
  { x: 20, y: 580, width: 200, height: 30 }, // الاسم
  { x: 20, y: 610, width: 200, height: 25 }, // رقم العضوية
  { x: 320, y: 520, width: 80, height: 80 }, // QR code
];

function isOverlapping(obj: fabric.Object, zones: typeof PROTECTED_ZONES) {
  const objBounds = obj.getBoundingRect();
  for (const zone of zones) {
    const zoneRect = new fabric.Rect({
      left: zone.x,
      top: zone.y,
      width: zone.width,
      height: zone.height,
    });
    const zoneBounds = zoneRect.getBoundingRect();
    if (objBounds.intersectsWithRect(zoneBounds)) {
      return true;
    }
  }
  return false;
}

export function CardDesignerPage() {
  const { session } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [backgrounds, setBackgrounds] = useState<{ id: string; image_url: string }[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // تحميل البيانات الأولية
  useEffect(() => {
    if (!session) return;
    const client = supabase;
    if (!client) {
      setError('خدمة قاعدة البيانات غير مفعلة');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [bgRes, stickerRes] = await Promise.all([
          client.from('card_backgrounds').select('id, image_url').eq('is_active', true).order('sort_order'),
          client.from('card_stickers').select('id, name, image_url').eq('is_active', true).order('sort_order'),
        ]);
        if (bgRes.error) throw bgRes.error;
        if (stickerRes.error) throw stickerRes.error;
        setBackgrounds(bgRes.data ?? []);
        setStickers(stickerRes.data ?? []);

        // جلب التصميم الحالي
        const { data: design, error: designError } = await client
          .from('customer_card_designs')
          .select('background_id, design_data')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (designError) throw designError;
        if (design) {
          setSelectedBackground(design.background_id);
          if (design.design_data && typeof design.design_data === 'object' && 'stickers' in design.design_data) {
            setPlacedStickers(design.design_data.stickers as PlacedSticker[]);
          }
        }
      } catch (err) {
        console.error(err);
        setError('تعذر تحميل بيانات المصمم');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  // تهيئة Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current || loading) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 400,
      height: 640,
      backgroundColor: '#ffffff',
    });
    setFabricCanvas(canvas);

    // تحميل الخلفية إن وجدت
    if (selectedBackground) {
      const bg = backgrounds.find((b) => b.id === selectedBackground);
      if (bg) {
        fabric.Image.fromURL(bg.image_url, (img) => {
          img.scaleToWidth(400);
          img.set({ left: 0, top: 0, selectable: false, evented: false });
          canvas.add(img);
          canvas.sendToBack(img);
          canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      }
    }

    // إضافة العناصر الثابتة (الشعار، الاسم، الرقم، QR)
    const addStaticElements = () => {
      // شعار
      const logo = new fabric.Text('فايبز', {
        left: 20,
        top: 20,
        fontSize: 24,
        fontWeight: 'bold',
        fill: '#3b1d2a',
        selectable: false,
        evented: false,
      });
      canvas.add(logo);

      // اسم العميل
      const name = new fabric.Text(session?.user?.email || 'اسم العميل', {
        left: 20,
        top: 580,
        fontSize: 16,
        fill: '#3b1d2a',
        selectable: false,
        evented: false,
      });
      canvas.add(name);

      // رقم العضوية
      const membership = new fabric.Text('رقم العضوية: VIB-1234567', {
        left: 20,
        top: 610,
        fontSize: 14,
        fill: '#555',
        selectable: false,
        evented: false,
      });
      canvas.add(membership);

      // QR code (رمز بسيط، يمكن استبدال بـ QRCode)
      const qr = new fabric.Rect({
        left: 320,
        top: 520,
        width: 80,
        height: 80,
        fill: '#000',
        selectable: false,
        evented: false,
      });
      canvas.add(qr);
    };
    addStaticElements();

    // إضافة الملصقات المحفوظة
    placedStickers.forEach((ps) => {
      const sticker = stickers.find((s) => s.id === ps.id);
      if (sticker) {
        fabric.Image.fromURL(sticker.image_url, (img) => {
          img.set({
            left: ps.x,
            top: ps.y,
            scaleX: ps.scale,
            scaleY: ps.scale,
            angle: ps.rotation,
          });
          img.set({ id: ps.id });
          canvas.add(img);
          canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      }
    });

    // أحداث التحديد
    canvas.on('selection:created', (e) => {
      if (e.selected && e.selected.length > 0) {
        const obj = e.selected[0];
        setSelectedObjectId(obj.id as string);
      }
    });
    canvas.on('selection:cleared', () => setSelectedObjectId(null));

    // منطقة محمية: منع تحريك الكائنات داخل المناطق المحمية
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (isOverlapping(obj, PROTECTED_ZONES)) {
        // إعادة الكائن إلى موضعه السابق
        obj.set({
          left: obj._originalLeft || obj.left,
          top: obj._originalTop || obj.top,
        });
        obj.setCoords();
        canvas.renderAll();
      }
    });

    // حفظ الموضع الأصلي عند بدء السحب
    canvas.on('mouse:down', (e) => {
      if (e.target) {
        e.target._originalLeft = e.target.left;
        e.target._originalTop = e.target.top;
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [loading, backgrounds, selectedBackground, placedStickers, stickers, session]);

  // تحديث الخلفية عند تغييرها
  useEffect(() => {
    if (!fabricCanvas || !selectedBackground) return;
    const bg = backgrounds.find((b) => b.id === selectedBackground);
    if (bg) {
      fabric.Image.fromURL(bg.image_url, (img) => {
        img.scaleToWidth(400);
        img.set({ left: 0, top: 0, selectable: false, evented: false });
        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img);
        fabricCanvas.renderAll();
      }, { crossOrigin: 'anonymous' });
    }
  }, [selectedBackground, fabricCanvas, backgrounds]);

  // إضافة ملصق
  const addSticker = (stickerId: string) => {
    if (!fabricCanvas) return;
    const sticker = stickers.find((s) => s.id === stickerId);
    if (!sticker) return;

    fabric.Image.fromURL(sticker.image_url, (img) => {
      img.set({
        left: 200 + Math.random() * 100 - 50,
        top: 200 + Math.random() * 100 - 50,
        scaleX: 0.5,
        scaleY: 0.5,
        angle: 0,
        id: stickerId,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  };

  // حذف الملصق المحدد
  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject();
    if (active) {
      fabricCanvas.remove(active);
      fabricCanvas.renderAll();
      setSelectedObjectId(null);
    }
  };

  // تدوير الملصق المحدد
  const rotateSelected = () => {
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject();
    if (active) {
      active.rotate((active.angle || 0) + 15);
      fabricCanvas.renderAll();
    }
  };

  // تغيير حجم الملصق
  const scaleSelected = (factor: number) => {
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject();
    if (active) {
      active.scaleX = (active.scaleX || 1) * factor;
      active.scaleY = (active.scaleY || 1) * factor;
      fabricCanvas.renderAll();
    }
  };

  // حفظ التصميم
  const saveDesign = async () => {
    if (!fabricCanvas || !session) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // جمع الملصقات من الـ canvas
      const objects = fabricCanvas.getObjects();
      const stickersData: PlacedSticker[] = objects
        .filter((obj) => obj.id && typeof obj.id === 'string')
        .map((obj) => ({
          id: obj.id as string,
          x: obj.left || 0,
          y: obj.top || 0,
          scale: obj.scaleX || 1,
          rotation: obj.angle || 0,
        }));

      const designData = { stickers: stickersData };
      const client = supabase;
      if (!client) throw new Error('Supabase not configured');

      const { data: existing, error: checkError } = await client
        .from('customer_card_designs')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (checkError) throw checkError;

      if (existing) {
        const { error: updateError } = await client
          .from('customer_card_designs')
          .update({
            background_id: selectedBackground,
            design_data: designData,
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await client
          .from('customer_card_designs')
          .insert({
            user_id: session.user.id,
            background_id: selectedBackground,
            design_data: designData,
            is_active: true,
          });
        if (insertError) throw insertError;
      }

      setSuccess('تم حفظ التصميم بنجاح');
      setPlacedStickers(stickersData);
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ التصميم');
    } finally {
      setSaving(false);
    }
  };

  // تصدير الصورة
  const exportImage = async () => {
    if (!fabricCanvas) return;
    setExporting(true);
    try {
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
      });
      const link = document.createElement('a');
      link.download = 'vibes-card.png';
      link.href = dataURL;
      link.click();
    } catch (err) {
      console.error(err);
      setError('تعذر تصدير الصورة');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <PageLoader label="جاري تحميل المصمم..." />;

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
            className="rounded-full bg-vibes-800 p-2 text-white hover:bg-vibes-700"
          >
            <Save className="size-5" />
          </button>
        </header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Canvas */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <canvas ref={canvasRef} className="mx-auto w-full max-w-sm" />
          </div>

          {/* شريط الأدوات والمكتبة */}
          <div className="space-y-6">
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
                    <img src={bg.image_url} alt="خلفية" className="h-full w-full rounded-lg object-cover" />
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
                    <img src={sticker.image_url} alt={sticker.name} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {/* أدوات التحرير */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-vibes-900">أدوات التحرير</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={rotateSelected}
                  className="rounded-xl border border-vibes-200 p-2 hover:bg-vibes-50"
                  title="تدوير"
                >
                  <RotateCw className="size-5" />
                </button>
                <button
                  onClick={() => scaleSelected(1.1)}
                  className="rounded-xl border border-vibes-200 p-2 hover:bg-vibes-50"
                  title="تكبير"
                >
                  <Maximize className="size-5" />
                </button>
                <button
                  onClick={() => scaleSelected(0.9)}
                  className="rounded-xl border border-vibes-200 p-2 hover:bg-vibes-50"
                  title="تصغير"
                >
                  <Minimize className="size-5" />
                </button>
                <button
                  onClick={deleteSelected}
                  className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  title="حذف"
                >
                  <Trash2 className="size-5" />
                </button>
                <button
                  onClick={() => {
                    // ترتيب الطبقات: رفع للأمام
                    const active = fabricCanvas?.getActiveObject();
                    if (active) {
                      fabricCanvas?.bringForward(active);
                      fabricCanvas?.renderAll();
                    }
                  }}
                  className="rounded-xl border border-vibes-200 p-2 hover:bg-vibes-50"
                  title="رفع للأمام"
                >
                  <Layers className="size-5" />
                </button>
              </div>
            </div>

            {/* تصدير */}
            <button
              onClick={exportImage}
              disabled={exporting}
              className="w-full rounded-2xl bg-vibes-800 py-3 font-bold text-white hover:bg-vibes-700 flex items-center justify-center gap-2"
            >
              <Download className="size-5" />
              {exporting ? 'جاري التصدير...' : 'تحميل البطاقة'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
