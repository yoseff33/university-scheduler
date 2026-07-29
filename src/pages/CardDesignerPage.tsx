// src/pages/CardDesignerPage.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { Canvas, FabricImage, type FabricObject } from 'fabric'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Copy,
  Download,
  FlipHorizontal2,
  ImagePlus,
  Layers,
  LoaderCircle,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  Undo2,
  Upload,
  Zap,
  Sparkles,
  Palette,
  Grid3x3,
  FolderOpen,
  Image as ImageIcon,
  Sliders,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { PageLoader } from '../components/PageLoader'
import { Alert } from '../components/Alert'
import type { Json } from '../types/database'

// ===================== الثوابت والإعدادات =====================
const CARD_WIDTH = 1015
const CARD_HEIGHT = 640
const MAX_OBJECTS = 30
const MAX_HISTORY = 50
const MIN_OBJECT_SIZE = 48
const MAX_OBJECT_SIZE = 420
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_CUSTOMER_STICKERS = 50
const ALLOWED_IMAGE_TYPES = ['image/png'] // PNG فقط

type StickerSourceType = 'official' | 'customer'

interface CardProfile {
  name: string | null
  membership_number: string
  membership_qr_token: string
}

interface Background {
  id: string
  name: string
  image_url: string
}

interface OfficialSticker {
  id: string
  name: string
  image_url: string
  category: string | null
  is_vip_only: boolean
}

interface CustomerSticker {
  id: string
  image_url: string
  storage_path: string
  original_file_name: string | null
  signed_url: string
}

interface StickerSource {
  id: string
  name: string
  url: string
  sourceType: StickerSourceType
  sourcePath: string | null
  category: string | null
}

interface TransformSnapshot {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  opacity: number
  flipX: boolean
}

interface SavedSticker extends TransformSnapshot {
  width: number
  height: number
  source_type: StickerSourceType
  source_id: string
  source_path: string | null
}

interface CardDesignData {
  version: 1
  background_id: string | null
  stickers: SavedSticker[]
}

interface DesignRow {
  id: string
  design_name: string
  design_data: Json
  preview_image_url: string | null
  is_active: boolean
  updated_at: string
}

interface ProtectedZone {
  id: string
  x: number
  y: number
  width: number
  height: number
}

type StickerObject = FabricImage & {
  sourceType?: StickerSourceType
  sourceId?: string
  sourcePath?: string | null
  lastValid?: TransformSnapshot
}

// ===================== مناطق الحماية =====================
const PROTECTED_ZONES: ProtectedZone[] = [
  { id: 'brand', x: 610, y: 34, width: 360, height: 125 },
  { id: 'cups', x: 44, y: 34, width: 360, height: 118 },
  { id: 'member', x: 490, y: 420, width: 470, height: 175 },
  { id: 'qr', x: 44, y: 390, width: 205, height: 205 },
]

// ===================== دوال مساعدة =====================
function formatMembershipNumber(value: string) {
  if (!value) return '—'
  return value.startsWith('VIB-') ? value : `VIB-${value}`
}

function extensionFor(file: File) {
  if (file.type === 'image/png') return 'png'
  return 'png' // فقط PNG
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseSavedSticker(value: unknown): SavedSticker | null {
  if (!isRecord(value)) return null
  const sourceType = value.source_type
  if (sourceType !== 'official' && sourceType !== 'customer') return null
  if (
    typeof value.source_id !== 'string' ||
    typeof value.left !== 'number' ||
    typeof value.top !== 'number' ||
    typeof value.scaleX !== 'number' ||
    typeof value.scaleY !== 'number' ||
    typeof value.angle !== 'number' ||
    typeof value.opacity !== 'number' ||
    typeof value.flipX !== 'boolean' ||
    typeof value.width !== 'number' ||
    typeof value.height !== 'number'
  ) {
    return null
  }
  return {
    width: value.width,
    height: value.height,
    source_type: sourceType,
    source_id: value.source_id,
    source_path: typeof value.source_path === 'string' ? value.source_path : null,
    left: value.left,
    top: value.top,
    scaleX: value.scaleX,
    scaleY: value.scaleY,
    angle: value.angle,
    opacity: value.opacity,
    flipX: value.flipX,
  }
}

function parseDesignData(value: Json): CardDesignData | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.stickers)) return null
  const stickers = value.stickers
    .map(parseSavedSticker)
    .filter((sticker): sticker is SavedSticker => sticker !== null)
    .slice(0, MAX_OBJECTS)
  return {
    version: 1,
    background_id: typeof value.background_id === 'string' ? value.background_id : null,
    stickers,
  }
}

function snapshotObject(object: StickerObject): TransformSnapshot {
  return {
    left: object.left,
    top: object.top,
    scaleX: object.scaleX,
    scaleY: object.scaleY,
    angle: object.angle,
    opacity: object.opacity,
    flipX: object.flipX,
  }
}

function restoreObjectSnapshot(object: StickerObject, snapshot: TransformSnapshot) {
  object.set(snapshot)
  object.setCoords()
}

function intersectsProtectedZone(object: StickerObject) {
  object.setCoords()
  const rect = object.getBoundingRect()
  return PROTECTED_ZONES.some(
    (zone) =>
      rect.left < zone.x + zone.width &&
      rect.left + rect.width > zone.x &&
      rect.top < zone.y + zone.height &&
      rect.top + rect.height > zone.y
  )
}

function remainsPartlyInsideCard(object: StickerObject) {
  const rect = object.getBoundingRect()
  const minimumVisible = 38
  return !(
    rect.left + rect.width < minimumVisible ||
    rect.top + rect.height < minimumVisible ||
    rect.left > CARD_WIDTH - minimumVisible ||
    rect.top > CARD_HEIGHT - minimumVisible
  )
}

function extractRpcRow(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0]
    return isRecord(first) ? first : null
  }
  return isRecord(value) ? value : null
}

function parseDesignRow(value: unknown): DesignRow | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.design_name !== 'string' ||
    typeof value.is_active !== 'boolean' ||
    typeof value.updated_at !== 'string' ||
    !('design_data' in value)
  ) {
    return null
  }
  return {
    id: value.id,
    design_name: value.design_name,
    design_data: value.design_data as Json,
    preview_image_url:
      typeof value.preview_image_url === 'string' ? value.preview_image_url : null,
    is_active: value.is_active,
    updated_at: value.updated_at,
  }
}

// ===================== المكون الرئيسي =====================
export function CardDesignerPage() {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''
  const htmlCanvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  const sourceMapRef = useRef<Map<string, StickerSource>>(new Map())
  const selectedBackgroundRef = useRef<string | null>(null)
  const suppressHistoryRef = useRef(false)
  const historyRef = useRef<CardDesignData[]>([])
  const historyIndexRef = useRef(-1)
  const initialDesignLoadedRef = useRef(false)

  const [profile, setProfile] = useState<CardProfile | null>(null)
  const [activeCups, setActiveCups] = useState(0)
  const [cupsRequired, setCupsRequired] = useState(0)
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [officialStickers, setOfficialStickers] = useState<OfficialSticker[]>([])
  const [customerStickers, setCustomerStickers] = useState<CustomerSticker[]>([])
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null)
  const [designs, setDesigns] = useState<DesignRow[]>([])
  const [activeDesign, setActiveDesign] = useState<DesignRow | null>(null)
  const [designName, setDesignName] = useState('بطاقتي')
  const [selectedObject, setSelectedObject] = useState<StickerObject | null>(null)
  const [selectedOpacity, setSelectedOpacity] = useState(1)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'backgrounds' | 'official' | 'customer' | 'designs' | 'properties'>('official')

  // ===== حساب المصادر =====
  const officialSources = useMemo<StickerSource[]>(
    () =>
      officialStickers.map((sticker) => ({
        id: sticker.id,
        name: sticker.name,
        url: sticker.image_url,
        sourceType: 'official' as const,
        sourcePath: null,
        category: sticker.category,
      })),
    [officialStickers]
  )

  const customerSources = useMemo<StickerSource[]>(
    () =>
      customerStickers.map((sticker) => ({
        id: sticker.id,
        name: sticker.original_file_name || 'ملصقي',
        url: sticker.signed_url,
        sourceType: 'customer' as const,
        sourcePath: sticker.storage_path,
        category: 'ملصقاتي',
      })),
    [customerStickers]
  )

  const allSources = useMemo(
    () => [...officialSources, ...customerSources],
    [officialSources, customerSources]
  )

  useEffect(() => {
    sourceMapRef.current = new Map(
      allSources.map((source) => [`${source.sourceType}:${source.id}`, source])
    )
  }, [allSources])

  // ===== عمليات التصميم =====
  const serializeCurrentDesign = useCallback((): CardDesignData => {
    const canvas = fabricCanvasRef.current
    const stickers = (canvas?.getObjects() ?? [])
      .map((object) => object as StickerObject)
      .filter(
        (object) =>
          (object.sourceType === 'official' || object.sourceType === 'customer') &&
          typeof object.sourceId === 'string'
      )
      .slice(0, MAX_OBJECTS)
      .map<SavedSticker>((object) => ({
        width: object.width || 1,
        height: object.height || 1,
        source_type: object.sourceType as StickerSourceType,
        source_id: object.sourceId as string,
        source_path: object.sourcePath ?? null,
        ...snapshotObject(object),
      }))
    return {
      version: 1,
      background_id: selectedBackgroundRef.current,
      stickers,
    }
  }, [])

  const pushHistory = useCallback(() => {
    if (suppressHistoryRef.current) return
    const snapshot = serializeCurrentDesign()
    const serialized = JSON.stringify(snapshot)
    const current = historyRef.current[historyIndexRef.current]
    if (current && JSON.stringify(current) === serialized) return
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    nextHistory.push(snapshot)
    if (nextHistory.length > MAX_HISTORY) nextHistory.shift()
    historyRef.current = nextHistory
    historyIndexRef.current = nextHistory.length - 1
  }, [serializeCurrentDesign])

  const applyObjectConstraints = useCallback((object: StickerObject, notify = true) => {
    const scaledWidth = object.getScaledWidth()
    const scaledHeight = object.getScaledHeight()
    const largestSide = Math.max(scaledWidth, scaledHeight)
    const smallestSide = Math.min(scaledWidth, scaledHeight)

    if (largestSide > MAX_OBJECT_SIZE) {
      const factor = MAX_OBJECT_SIZE / largestSide
      object.set({ scaleX: object.scaleX * factor, scaleY: object.scaleY * factor })
    } else if (smallestSide < MIN_OBJECT_SIZE) {
      const factor = MIN_OBJECT_SIZE / Math.max(smallestSide, 1)
      object.set({ scaleX: object.scaleX * factor, scaleY: object.scaleY * factor })
    }
    object.set({ opacity: Math.max(0.15, Math.min(object.opacity, 1)) })
    object.setCoords()

    const invalid = intersectsProtectedZone(object) || !remainsPartlyInsideCard(object)
    if (invalid) {
      if (object.lastValid) {
        restoreObjectSnapshot(object, object.lastValid)
      } else {
        const safeLargestSide = Math.max(object.getScaledWidth(), object.getScaledHeight(), 1)
        const safeFactor = Math.min(120 / safeLargestSide, 1)
        object.set({
          left: 380,
          top: 300,
          scaleX: object.scaleX * safeFactor,
          scaleY: object.scaleY * safeFactor,
        })
        object.setCoords()
        object.lastValid = snapshotObject(object)
      }
      if (notify) setError('لا يمكن وضع الملصق فوق بيانات البطاقة أو خارج البطاقة بالكامل.')
      return false
    }
    object.lastValid = snapshotObject(object)
    return true
  }, [])

  const addSourceToCanvas = useCallback(
    async (source: StickerSource, saved?: SavedSticker) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      if (!saved && canvas.getObjects().length >= MAX_OBJECTS) {
        setError(`الحد الأعلى ${MAX_OBJECTS} ملصقاً لكل تصميم.`)
        return
      }
      try {
        const image = (await FabricImage.fromURL(source.url, {
          crossOrigin: 'anonymous',
        })) as StickerObject

        const naturalWidth = image.width || 1
        const initialScale = Math.min(180 / naturalWidth, 1)

        image.set({
          left: saved?.left ?? CARD_WIDTH / 2,
          top: saved?.top ?? CARD_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          scaleX: saved?.scaleX ?? initialScale,
          scaleY: saved?.scaleY ?? initialScale,
          angle: saved?.angle ?? 0,
          opacity: saved?.opacity ?? 1,
          flipX: saved?.flipX ?? false,
          cornerSize: 24,
          touchCornerSize: 34,
          transparentCorners: false,
          borderColor: '#ffffff',
          cornerColor: '#6f3b50',
          lockScalingFlip: true,
        })

        image.sourceType = source.sourceType
        image.sourceId = source.id
        image.sourcePath = source.sourcePath
        image.lastValid = undefined

        const wasHistorySuppressed = suppressHistoryRef.current
        suppressHistoryRef.current = true
        canvas.add(image)
        canvas.setActiveObject(image)
        applyObjectConstraints(image, false)
        suppressHistoryRef.current = wasHistorySuppressed
        canvas.requestRenderAll()
        if (!wasHistorySuppressed) pushHistory()
      } catch (err) {
        if (import.meta.env.DEV) console.error(err)
        setError('تعذر تحميل صورة الملصق. تأكد من إعدادات CORS في Supabase Storage.')
      }
    },
    [applyObjectConstraints, pushHistory]
  )

  const restoreDesign = useCallback(
    async (design: CardDesignData, resetHistory: boolean) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return

      suppressHistoryRef.current = true
      canvas.discardActiveObject()
      canvas.clear()
      setSelectedObject(null)

      selectedBackgroundRef.current = design.background_id
      setSelectedBackground(design.background_id)

      for (const saved of design.stickers.slice(0, MAX_OBJECTS)) {
        const source = sourceMapRef.current.get(`${saved.source_type}:${saved.source_id}`)
        if (!source) continue
        await addSourceToCanvas(source, saved)
      }

      canvas.discardActiveObject()
      canvas.requestRenderAll()
      suppressHistoryRef.current = false

      if (resetHistory) {
        historyRef.current = [serializeCurrentDesign()]
        historyIndexRef.current = 0
      }
    },
    [addSourceToCanvas, serializeCurrentDesign]
  )

  // ===== تحميل البيانات =====
  const loadData = useCallback(async () => {
    if (!session) return
    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [profileResult, settingsResult, cupsResult, backgroundsResult, stickersResult, customerResult, designResult] =
        await Promise.all([
          client
            .from('profiles')
            .select('name, membership_number, membership_qr_token')
            .eq('id', session.user.id)
            .maybeSingle(),
          client
            .from('loyalty_settings')
            .select('cups_required')
            .eq('id', 1)
            .maybeSingle(),
          client
            .from('loyalty_cups')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', session.user.id)
            .eq('status', 'active'),
          client
            .from('card_backgrounds')
            .select('id, name, image_url')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          client
            .from('stickers_library')
            .select('id, name, image_url, category, is_vip_only')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          client
            .from('customer_stickers')
            .select('id, image_url, storage_path, original_file_name')
            .eq('customer_id', session.user.id)
            .order('created_at', { ascending: false }),
          client
            .from('loyalty_card_designs')
            .select('id, design_name, design_data, preview_image_url, is_active, updated_at')
            .eq('customer_id', session.user.id)
            .order('updated_at', { ascending: false }),
        ])

      if (profileResult.error) throw profileResult.error
      if (!profileResult.data) throw new Error('الملف الشخصي غير موجود')
      if (settingsResult.error) throw settingsResult.error
      if (!settingsResult.data) throw new Error('إعدادات الولاء غير موجودة')
      if (cupsResult.error) throw cupsResult.error
      if (backgroundsResult.error) throw backgroundsResult.error
      if (stickersResult.error) throw stickersResult.error
      if (customerResult.error) throw customerResult.error
      if (designResult.error) throw designResult.error

      const customerRows = customerResult.data ?? []
      const paths = customerRows.map((sticker) => sticker.storage_path)
      let signedUrlByPath = new Map<string, string>()

      if (paths.length > 0) {
        const { data: signedData, error: signedError } = await client.storage
          .from('customer-stickers')
          .createSignedUrls(paths, 60 * 60)

        if (signedError) throw signedError

        const signedItems = (signedData ?? [])
          .filter((item) => Boolean(item.signedUrl) && Boolean(item.path))
          .map((item) => [item.path!, item.signedUrl] as [string, string])

        signedUrlByPath = new Map(signedItems)
      }

      const backgroundsData = backgroundsResult.data ?? []
      const designRows = (designResult.data ?? [])
        .map(parseDesignRow)
        .filter((design): design is DesignRow => design !== null)
      const design = designRows.find((item) => item.is_active) ?? null
      const parsedDesign = design ? parseDesignData(design.design_data) : null
      const defaultBackground = parsedDesign?.background_id ?? backgroundsData[0]?.id ?? null

      setProfile(profileResult.data)
      setCupsRequired(settingsResult.data.cups_required)
      setActiveCups(cupsResult.count ?? 0)
      setBackgrounds(backgroundsData)
      setOfficialStickers(stickersResult.data ?? [])
      setCustomerStickers(
        customerRows
          .map((sticker) => ({
            ...sticker,
            signed_url: signedUrlByPath.get(sticker.storage_path) ?? '',
          }))
          .filter((sticker) => sticker.signed_url)
      )
      setDesigns(designRows)
      setActiveDesign(design)
      setDesignName(design?.design_name ?? 'بطاقتي')
      selectedBackgroundRef.current = defaultBackground
      setSelectedBackground(defaultBackground)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر تحميل مصمم البطاقة. نفّذ ملف SQL وتأكد من إعدادات Storage وRLS.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ===== تهيئة الفابريك =====
  useEffect(() => {
    const element = htmlCanvasRef.current
    if (!element) return

    const canvas = new Canvas(element, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      preserveObjectStacking: true,
      selection: true,
    })

    fabricCanvasRef.current = canvas
    canvas.wrapperEl.style.position = 'absolute'
    canvas.wrapperEl.style.inset = '0'
    canvas.wrapperEl.style.zIndex = '10'
    canvas.wrapperEl.style.touchAction = 'none'
    canvas.upperCanvasEl.style.touchAction = 'none'

    const updateSelection = () => {
      const active = canvas.getActiveObject() as StickerObject | undefined
      setSelectedObject(active ?? null)
      setSelectedOpacity(active?.opacity ?? 1)
    }

    const validateTransform = (event: { target?: FabricObject }) => {
      const target = event.target as StickerObject | undefined
      if (!target) return
      applyObjectConstraints(target)
      canvas.requestRenderAll()
    }

    canvas.on('selection:created', updateSelection)
    canvas.on('selection:updated', updateSelection)
    canvas.on('selection:cleared', updateSelection)
    canvas.on('object:moving', validateTransform)
    canvas.on('object:scaling', validateTransform)
    canvas.on('object:rotating', validateTransform)
    canvas.on('object:modified', (event) => {
      validateTransform(event)
      pushHistory()
    })
    canvas.on('object:added', pushHistory)
    canvas.on('object:removed', pushHistory)

    const resize = () => {
      const parentWidth = canvas.wrapperEl.parentElement?.clientWidth ?? CARD_WIDTH
      const cssWidth = Math.min(parentWidth, CARD_WIDTH)
      const cssHeight = cssWidth * (CARD_HEIGHT / CARD_WIDTH)
      canvas.setDimensions({ width: `${cssWidth}px`, height: `${cssHeight}px` }, { cssOnly: true })
      canvas.calcOffset()
    }

    resize()
    const observer = new ResizeObserver(resize)
    if (canvas.wrapperEl.parentElement) observer.observe(canvas.wrapperEl.parentElement)

    setCanvasReady(true)

    return () => {
      observer.disconnect()
      setCanvasReady(false)
      fabricCanvasRef.current = null
      canvas.dispose()
    }
  }, [applyObjectConstraints, pushHistory])

  // ===== استعادة التصميم الأولي =====
  useEffect(() => {
    if (!canvasReady || loading || initialDesignLoadedRef.current) return
    const design = activeDesign ? parseDesignData(activeDesign.design_data) : null
    const emptyDesign: CardDesignData = {
      version: 1,
      background_id: selectedBackgroundRef.current,
      stickers: [],
    }
    initialDesignLoadedRef.current = true
    void restoreDesign(design ?? emptyDesign, true)
  }, [activeDesign, canvasReady, loading, restoreDesign])

  // ===== دوال التحكم =====
  const changeBackground = (backgroundId: string) => {
    selectedBackgroundRef.current = backgroundId
    setSelectedBackground(backgroundId)
    pushHistory()
  }

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    canvas.remove(active)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
  }

  const cloneSelected = async () => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject() as StickerObject | undefined
    if (!canvas || !active) return
    if (canvas.getObjects().length >= MAX_OBJECTS) {
      setError(`الحد الأعلى ${MAX_OBJECTS} ملصقاً لكل تصميم.`)
      return
    }
    const clone = (await active.clone()) as StickerObject
    clone.set({ left: active.left + 28, top: active.top + 28 })
    clone.sourceType = active.sourceType
    clone.sourceId = active.sourceId
    clone.sourcePath = active.sourcePath
    clone.lastValid = undefined
    const wasHistorySuppressed = suppressHistoryRef.current
    suppressHistoryRef.current = true
    canvas.add(clone)
    canvas.setActiveObject(clone)
    applyObjectConstraints(clone, false)
    suppressHistoryRef.current = wasHistorySuppressed
    canvas.requestRenderAll()
    if (!wasHistorySuppressed) pushHistory()
  }

  const flipSelected = () => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject() as StickerObject | undefined
    if (!canvas || !active) return
    active.set({ flipX: !active.flipX })
    active.setCoords()
    active.lastValid = snapshotObject(active)
    canvas.requestRenderAll()
    pushHistory()
  }

  const moveLayer = (direction: 'forward' | 'backward') => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    if (direction === 'forward') canvas.bringObjectForward(active)
    else canvas.sendObjectBackwards(active)
    canvas.requestRenderAll()
    pushHistory()
  }

  const changeOpacity = (value: number) => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject() as StickerObject | undefined
    if (!canvas || !active) return
    const opacity = Math.max(0.15, Math.min(value, 1))
    active.set({ opacity })
    active.lastValid = snapshotObject(active)
    setSelectedOpacity(opacity)
    canvas.requestRenderAll()
  }

  const commitOpacity = () => pushHistory()

  const undo = async () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    await restoreDesign(historyRef.current[historyIndexRef.current], false)
  }

  const redo = async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    await restoreDesign(historyRef.current[historyIndexRef.current], false)
  }

  const resetDesign = async () => {
    if (!window.confirm('إرجاع التصميم للوضع الافتراضي وحذف الملصقات من البطاقة؟')) return
    await restoreDesign(
      {
        version: 1,
        background_id: backgrounds[0]?.id ?? null,
        stickers: [],
      },
      false
    )
    pushHistory()
  }

  // ===== رفع الملصق (PNG فقط) =====
  const uploadCustomerSticker = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !session) return

    if (customerStickers.length >= MAX_CUSTOMER_STICKERS) {
      setError(`وصلت للحد الأعلى: ${MAX_CUSTOMER_STICKERS} ملصقاً شخصياً.`)
      return
    }

    // PNG فقط
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(
        'عشان تطلع بطاقتك كشخة وبدون خلفية تخرب التصميم، ارفع صورة بصيغة PNG شفافة فقط. يمكنك إزالة خلفية صورتك بنقرة واحدة عبر هذا الموقع:'
      )
      // عرض رابط إزالة الخلفية
      if (window.confirm('افتح remove.bg لإزالة الخلفية؟')) {
        window.open('https://www.remove.bg/ar', '_blank')
      }
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('حجم الملصق لازم يكون 5MB أو أقل.')
      return
    }

    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    const path = `${session.user.id}/${crypto.randomUUID()}.png`
    let insertedStickerId: string | null = null

    try {
      const { error: uploadError } = await client.storage
        .from('customer-stickers')
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      const { data: row, error: insertError } = await client
        .from('customer_stickers')
        .insert({
          customer_id: session.user.id,
          image_url: path,
          storage_path: path,
          original_file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select('id, image_url, storage_path, original_file_name')
        .single()

      if (insertError) throw insertError
      insertedStickerId = row.id

      const { data: signedData, error: signedError } = await client.storage
        .from('customer-stickers')
        .createSignedUrl(path, 60 * 60)

      if (signedError) throw signedError

      const sticker: CustomerSticker = {
        ...row,
        signed_url: signedData.signedUrl,
      }

      setCustomerStickers((current) => [sticker, ...current])
      setSuccess('تم رفع ملصقك. تقدر تضيفه للبطاقة الآن.')
    } catch (err) {
      if (insertedStickerId) {
        void client
          .from('customer_stickers')
          .delete()
          .eq('id', insertedStickerId)
          .eq('customer_id', session.user.id)
      }
      void client.storage.from('customer-stickers').remove([path])
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر رفع الملصق. تأكد من نوع الصورة وحجمها وإعدادات Storage.')
    } finally {
      setUploading(false)
    }
  }

  const deleteCustomerSticker = async (sticker: CustomerSticker) => {
    if (!window.confirm('حذف هذا الملصق من مكتبتك ومن التصميم الحالي؟')) return
    const client = supabase
    const canvas = fabricCanvasRef.current
    if (!client || !canvas) return

    const relatedObjects = canvas
      .getObjects()
      .map((object) => object as StickerObject)
      .filter((object) => object.sourceType === 'customer' && object.sourceId === sticker.id)

    const { error: rowError } = await client
      .from('customer_stickers')
      .delete()
      .eq('id', sticker.id)
      .eq('customer_id', userId)

    if (rowError) {
      setError(rowError.message)
      return
    }

    suppressHistoryRef.current = true
    relatedObjects.forEach((object) => canvas.remove(object))
    suppressHistoryRef.current = false
    pushHistory()
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    const { error: storageError } = await client.storage
      .from('customer-stickers')
      .remove([sticker.storage_path])

    if (storageError && import.meta.env.DEV) console.warn(storageError)

    setCustomerStickers((current) => current.filter((item) => item.id !== sticker.id))
    setSuccess('تم حذف الملصق.')
  }

  // ===== تصدير وحفظ =====
  const captureCard = async () => {
    const card = cardRef.current
    const canvas = fabricCanvasRef.current
    if (!card || !canvas) throw new Error('البطاقة غير جاهزة')
    await document.fonts.ready
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    return html2canvas(card, {
      useCORS: true,
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    })
  }

  const captureCardBlob = async () => {
    const exportedCanvas = await captureCard()
    const blob = await new Promise<Blob>((resolve, reject) => {
      exportedCanvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('تعذر إنشاء صورة البطاقة'))
      }, 'image/png')
    })
    return blob
  }

  const saveDesign = async (saveAsNew: boolean) => {
    if (!session || saving) return
    const client = supabase
    if (!client) {
      setError('الخدمة غير مفعلة حالياً.')
      return
    }

    const trimmedName = designName.trim()
    if (!trimmedName) {
      setError('اكتب اسماً للتصميم.')
      return
    }

    const designData = serializeCurrentDesign()
    if (designData.stickers.length > MAX_OBJECTS) {
      setError(`الحد الأعلى ${MAX_OBJECTS} ملصقاً لكل تصميم.`)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    let generatedPreviewPath: string | null = null

    try {
      const { data, error: saveError } = await client.rpc('save_loyalty_card_design', {
        p_design_id: saveAsNew ? null : activeDesign?.id ?? null,
        p_design_name: trimmedName,
        p_design_data: designData as unknown as Json,
        p_preview_image_url: null,
        p_activate: true,
      })

      if (saveError) throw saveError

      const row = extractRpcRow(data)
      const savedDesign = parseDesignRow(row)
      if (!savedDesign) throw new Error('لم ترجع دالة الحفظ بيانات تصميم صالحة')
      const designId = savedDesign.id

      try {
        const previewBlob = await captureCardBlob()
        const previewPath = `${session.user.id}/${designId}.png`
        const { error: previewUploadError } = await client.storage
          .from('card-previews')
          .upload(previewPath, previewBlob, {
            upsert: true,
            contentType: 'image/png',
            cacheControl: '3600',
          })

        if (!previewUploadError) {
          generatedPreviewPath = previewPath
          const { error: previewRowError } = await client
            .from('loyalty_card_designs')
            .update({ preview_image_url: previewPath })
            .eq('id', designId)
            .eq('customer_id', session.user.id)

          if (previewRowError) {
            generatedPreviewPath = null
            if (import.meta.env.DEV) console.warn('Preview path update failed', previewRowError)
          }
        }
      } catch (previewError) {
        if (import.meta.env.DEV) console.warn('Preview generation failed', previewError)
      }

      const nextDesign: DesignRow = {
        ...savedDesign,
        design_name: trimmedName,
        design_data: designData as unknown as Json,
        preview_image_url: generatedPreviewPath ?? savedDesign.preview_image_url,
        is_active: true,
      }

      setActiveDesign(nextDesign)
      setDesigns((current) => [
        nextDesign,
        ...current
          .filter((item) => item.id !== designId)
          .map((item) => ({ ...item, is_active: false })),
      ])
      setSuccess(saveAsNew ? 'تم حفظ نسخة جديدة وتفعيلها.' : 'تم حفظ التصميم بنجاح.')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر حفظ التصميم. ما تم استبدال التصميم النشط.')
    } finally {
      setSaving(false)
    }
  }

  const openDesign = async (design: DesignRow) => {
    const parsed = parseDesignData(design.design_data)
    if (!parsed) {
      setError('بيانات هذا التصميم غير صالحة أو من إصدار غير مدعوم.')
      return
    }
    setError(null)
    setSuccess(null)
    setActiveDesign(design)
    setDesignName(design.design_name)
    await restoreDesign(parsed, true)
  }

  const activateDesign = async (design: DesignRow) => {
    const client = supabase
    if (!client || saving) return
    const parsed = parseDesignData(design.design_data)
    if (!parsed) {
      setError('بيانات هذا التصميم غير صالحة أو من إصدار غير مدعوم.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data, error: activateError } = await client.rpc('save_loyalty_card_design', {
        p_design_id: design.id,
        p_design_name: design.design_name,
        p_design_data: design.design_data,
        p_preview_image_url: design.preview_image_url,
        p_activate: true,
      })
      if (activateError) throw activateError
      const activated = parseDesignRow(extractRpcRow(data))
      if (!activated) throw new Error('استجابة تفعيل التصميم غير صالحة')
      setDesigns((current) =>
        current.map((item) => ({
          ...(item.id === activated.id ? activated : item),
          is_active: item.id === activated.id,
        }))
      )
      setActiveDesign(activated)
      setDesignName(activated.design_name)
      await restoreDesign(parsed, true)
      setSuccess('تم تفعيل التصميم.')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر تفعيل التصميم.')
    } finally {
      setSaving(false)
    }
  }

  const deleteDesign = async (design: DesignRow) => {
    if (design.is_active) {
      setError('فعّل تصميماً آخر قبل حذف التصميم النشط.')
      return
    }
    if (!window.confirm(`حذف تصميم "${design.design_name}" نهائياً؟`)) return
    const client = supabase
    if (!client) return
    setError(null)
    setSuccess(null)
    const { error: deleteError } = await client
      .from('loyalty_card_designs')
      .delete()
      .eq('id', design.id)
      .eq('customer_id', userId)
    if (deleteError) {
      setError('تعذر حذف التصميم.')
      return
    }
    if (design.preview_image_url) {
      void client.storage.from('card-previews').remove([design.preview_image_url])
    }
    setDesigns((current) => current.filter((item) => item.id !== design.id))
    setSuccess('تم حذف التصميم.')
  }

  const downloadCard = async () => {
    if (exporting || !profile) return
    setExporting(true)
    setError(null)
    try {
      const exportedCanvas = await captureCard()
      const link = document.createElement('a')
      link.download = `vibes-card-${formatMembershipNumber(profile.membership_number)}.png`
      link.href = exportedCanvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('تعذر تصدير البطاقة. تأكد أن صور الخلفيات والملصقات تسمح بـ CORS.')
    } finally {
      setExporting(false)
    }
  }

  const shareCard = async () => {
    if (exporting || !profile) return
    setExporting(true)
    setError(null)
    try {
      const blob = await captureCardBlob()
      const file = new File(
        [blob],
        `vibes-card-${formatMembershipNumber(profile.membership_number)}.png`,
        { type: 'image/png' }
      )
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'بطاقة عضوية فايبز',
          text: 'بطاقتي الرقمية في فايبز',
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = file.name
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (import.meta.env.DEV) console.error(err)
      setError('تعذرت مشاركة البطاقة، جرّب تحميلها بدلاً من ذلك.')
    } finally {
      setExporting(false)
    }
  }

  // ===== التحميل الأولي =====
  if (loading) return <PageLoader label="جاري تحميل مصمم البطاقة..." />

  if (!profile) {
    return (
      <main className="min-h-screen bg-vibes-pattern px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Alert type="error">{error || 'الخدمة غير مفعلة حالياً.'}</Alert>
        </div>
      </main>
    )
  }

  // ===== العرض =====
  return (
    <main className="min-h-screen bg-gradient-to-br from-vibes-50 to-vibes-100/50 px-4 py-6 pb-28">
      <div className="mx-auto max-w-7xl">
        {/* رأس الصفحة */}
        <header className="flex flex-wrap items-center gap-3 py-4">
          <Link to="/loyalty" className="rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black text-vibes-900 flex items-center gap-2">
              <Sparkles className="size-7 text-vibes-600" />
              مصمم البطاقة الفاخر
            </h1>
            <p className="mt-1 text-sm text-vibes-600">حرّك الملصقات، غيّر الخلفية، وأضف لمساتك الخاصة</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveDesign(false)}
              disabled={saving}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-vibes-800 to-vibes-600 px-6 font-black text-white shadow-lg transition hover:scale-105 disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
              حفظ
            </button>
            <button
              type="button"
              onClick={() => void downloadCard()}
              disabled={exporting}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/80 px-4 font-black text-vibes-800 shadow-lg backdrop-blur-sm transition hover:scale-105 disabled:opacity-60"
            >
              <Download className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => void shareCard()}
              disabled={exporting}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/80 px-4 font-black text-vibes-800 shadow-lg backdrop-blur-sm transition hover:scale-105 disabled:opacity-60"
            >
              <Share2 className="size-5" />
            </button>
          </div>
        </header>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}

        {/* شبكة الصفحة: جانبية + وسط */}
        <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
          {/* القائمة الجانبية المبوّبة */}
          <aside className="order-2 lg:order-1">
            <div className="rounded-3xl bg-white/80 p-4 shadow-xl backdrop-blur-md">
              <div className="flex flex-wrap gap-1 border-b border-vibes-100 pb-2">
                <button
                  onClick={() => setActiveTab('backgrounds')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition ${
                    activeTab === 'backgrounds'
                      ? 'bg-vibes-800 text-white'
                      : 'text-vibes-600 hover:bg-vibes-50'
                  }`}
                >
                  <Palette className="size-4" />
                  خلفيات
                </button>
                <button
                  onClick={() => setActiveTab('official')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition ${
                    activeTab === 'official'
                      ? 'bg-vibes-800 text-white'
                      : 'text-vibes-600 hover:bg-vibes-50'
                  }`}
                >
                  <Grid3x3 className="size-4" />
                  ملصقات
                </button>
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition ${
                    activeTab === 'customer'
                      ? 'bg-vibes-800 text-white'
                      : 'text-vibes-600 hover:bg-vibes-50'
                  }`}
                >
                  <ImagePlus className="size-4" />
                  ملصقاتي
                </button>
                <button
                  onClick={() => setActiveTab('designs')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition ${
                    activeTab === 'designs'
                      ? 'bg-vibes-800 text-white'
                      : 'text-vibes-600 hover:bg-vibes-50'
                  }`}
                >
                  <FolderOpen className="size-4" />
                  تصاميمي
                </button>
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition ${
                    activeTab === 'properties'
                      ? 'bg-vibes-800 text-white'
                      : 'text-vibes-600 hover:bg-vibes-50'
                  }`}
                >
                  <Sliders className="size-4" />
                  خصائص
                </button>
              </div>

              <div className="mt-4 max-h-[70vh] overflow-y-auto">
                {/* تبويب الخلفيات */}
                {activeTab === 'backgrounds' && (
                  <div>
                    {backgrounds.length === 0 ? (
                      <p className="rounded-2xl bg-vibes-50 p-4 text-sm text-vibes-600">ما فيه خلفيات مفعلة.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {backgrounds.map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => changeBackground(bg.id)}
                            className={`aspect-[1.586/1] overflow-hidden rounded-2xl border-2 transition hover:scale-105 ${
                              selectedBackground === bg.id
                                ? 'border-vibes-700 shadow-lg shadow-vibes-200'
                                : 'border-transparent hover:border-vibes-300'
                            }`}
                          >
                            <img src={bg.image_url} alt={bg.name} className="size-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* تبويب الملصقات الرسمية */}
                {activeTab === 'official' && (
                  <div>
                    {officialSources.length === 0 ? (
                      <p className="rounded-2xl bg-vibes-50 p-4 text-sm text-vibes-600">ما فيه ملصقات رسمية مفعلة.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {officialSources.map((source) => (
                          <button
                            key={source.id}
                            onClick={() => void addSourceToCanvas(source)}
                            className="aspect-square rounded-2xl border border-vibes-100 bg-vibes-50 p-2 transition hover:scale-105 hover:border-vibes-400 hover:shadow-lg"
                            title={source.name}
                          >
                            <img src={source.url} alt={source.name} className="size-full object-contain" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* تبويب ملصقاتي */}
                {activeTab === 'customer' && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-vibes-600">
                        {customerStickers.length} / {MAX_CUSTOMER_STICKERS}
                      </span>
                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-1 rounded-xl bg-vibes-100 px-4 py-2 text-sm font-black text-vibes-800 transition hover:bg-vibes-200 disabled:opacity-60"
                      >
                        {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        رفع
                      </button>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(event) => void uploadCustomerSticker(event)}
                      />
                    </div>

                    {customerSources.length === 0 ? (
                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-vibes-300 bg-vibes-50 text-vibes-700 transition hover:bg-vibes-100"
                      >
                        <ImagePlus className="size-8" />
                        <span className="mt-2 text-sm font-black">ارفع أول ملصق PNG شفاف</span>
                      </button>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {customerStickers.map((sticker) => {
                          const source = customerSources.find((s) => s.id === sticker.id)
                          if (!source) return null
                          return (
                            <div key={sticker.id} className="group relative aspect-square rounded-2xl border border-vibes-100 bg-vibes-50 p-2">
                              <button onClick={() => void addSourceToCanvas(source)} className="size-full">
                                <img src={source.url} alt={source.name} className="size-full object-contain" />
                              </button>
                              <button
                                onClick={() => void deleteCustomerSticker(sticker)}
                                className="absolute left-1 top-1 grid size-7 place-items-center rounded-full bg-red-600 text-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-vibes-500 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      PNG شفافة فقط
                      <a
                        href="https://www.remove.bg/ar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-vibes-700 underline"
                      >
                        إزالة الخلفية <ExternalLink className="size-3" />
                      </a>
                    </p>
                  </div>
                )}

                {/* تبويب تصاميمي */}
                {activeTab === 'designs' && (
                  <div>
                    {designs.length === 0 ? (
                      <p className="rounded-2xl bg-vibes-50 p-4 text-sm text-vibes-600">احفظ أول تصميم عشان يظهر هنا.</p>
                    ) : (
                      <div className="space-y-3">
                        {designs.map((design) => (
                          <article
                            key={design.id}
                            className={`rounded-2xl border p-3 transition ${
                              design.is_active
                                ? 'border-vibes-500 bg-vibes-50 shadow-lg'
                                : 'border-vibes-100 bg-white hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-black text-vibes-900">
                                  {design.design_name}
                                </h3>
                                <p className="mt-1 text-xs text-vibes-500">
                                  {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(
                                    new Date(design.updated_at)
                                  )}
                                </p>
                              </div>
                              {design.is_active && (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                                  نشط
                                </span>
                              )}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => void openDesign(design)}
                                className="rounded-xl border border-vibes-200 py-1.5 text-xs font-black text-vibes-800 transition hover:bg-vibes-50"
                              >
                                فتح
                              </button>
                              <button
                                disabled={design.is_active || saving}
                                onClick={() => void activateDesign(design)}
                                className="rounded-xl bg-vibes-800 py-1.5 text-xs font-black text-white transition hover:bg-vibes-700 disabled:opacity-40"
                              >
                                تفعيل
                              </button>
                              <button
                                disabled={design.is_active}
                                onClick={() => void deleteDesign(design)}
                                className="rounded-xl bg-red-50 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-40"
                              >
                                حذف
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* تبويب الخصائص */}
                {activeTab === 'properties' && (
                  <div>
                    {!selectedObject ? (
                      <div className="rounded-2xl bg-vibes-50 p-6 text-center text-vibes-600">
                        <Zap className="mx-auto size-8 text-vibes-300" />
                        <p className="mt-2 text-sm font-bold">اضغط على ملصق داخل البطاقة</p>
                        <p className="text-xs">لضبط الشفافية، الدوران، والتكبير</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 flex items-center justify-between text-sm font-bold text-vibes-800">
                            <span>الشفافية</span>
                            <span>{Math.round(selectedOpacity * 100)}%</span>
                          </label>
                          <input
                            type="range"
                            min="0.15"
                            max="1"
                            step="0.05"
                            value={selectedOpacity}
                            onChange={(e) => changeOpacity(Number(e.target.value))}
                            onPointerUp={commitOpacity}
                            className="w-full accent-vibes-700"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => void cloneSelected()} className="rounded-2xl border border-vibes-200 p-3 text-sm font-black text-vibes-800 transition hover:bg-vibes-50">
                            <Copy className="mx-auto size-5" />
                            <span className="mt-1 block">نسخ</span>
                          </button>
                          <button onClick={flipSelected} className="rounded-2xl border border-vibes-200 p-3 text-sm font-black text-vibes-800 transition hover:bg-vibes-50">
                            <FlipHorizontal2 className="mx-auto size-5" />
                            <span className="mt-1 block">قلب</span>
                          </button>
                          <button onClick={() => moveLayer('forward')} className="rounded-2xl border border-vibes-200 p-3 text-sm font-black text-vibes-800 transition hover:bg-vibes-50">
                            <ArrowUp className="mx-auto size-5" />
                            <span className="mt-1 block">للأمام</span>
                          </button>
                          <button onClick={() => moveLayer('backward')} className="rounded-2xl border border-vibes-200 p-3 text-sm font-black text-vibes-800 transition hover:bg-vibes-50">
                            <ArrowDown className="mx-auto size-5" />
                            <span className="mt-1 block">للخلف</span>
                          </button>
                        </div>

                        <button onClick={deleteSelected} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 font-black text-white shadow-lg transition hover:scale-105">
                          <Trash2 className="size-5" />
                          حذف الملصق
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* الوسط: معاينة البطاقة */}
          <section className="order-1 lg:order-2">
            <div className="rounded-[2rem] bg-white/90 p-4 shadow-2xl backdrop-blur-sm">
              <div
                ref={cardRef}
                className="relative mx-auto aspect-[1.586/1] w-full max-w-[1015px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-vibes-900 via-vibes-700 to-vibes-500 shadow-2xl"
              >
                {selectedBackgroundData ? (
                  <img
                    src={selectedBackgroundData.image_url}
                    alt="خلفية البطاقة"
                    className="absolute inset-0 size-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-vibes-900 via-vibes-700 to-vibes-500" />
                )}

                <div className="absolute inset-0 bg-black/10" />
                <canvas ref={htmlCanvasRef} />

                {/* طبقة الواجهة الأمامية */}
                <div className="pointer-events-none absolute inset-0 z-20 text-white">
                  {/* العلامة التجارية */}
                  <div className="absolute right-[5.5%] top-[7%] text-right">
                    <p className="text-[clamp(12px,1.6vw,22px)] font-bold text-white/80 drop-shadow-lg">VIBES COFFEE</p>
                    <h2 className="mt-1 text-[clamp(26px,4vw,54px)] font-black leading-none drop-shadow-lg">فايبز</h2>
                    <p className="mt-2 text-[clamp(10px,1.25vw,17px)] font-bold text-white/70 drop-shadow">كل كوب يقرّبك من مكافأتك</p>
                  </div>

                  {/* عداد الأكواب */}
                  <div className="absolute left-[5.5%] top-[7%] rounded-2xl bg-white/15 px-4 py-2 backdrop-blur-md">
                    <p className="text-[clamp(9px,1.1vw,14px)] font-bold text-white/80">أكواب الولاء</p>
                    <p className="mt-1 text-[clamp(22px,3.2vw,42px)] font-black">{activeCups} / {cupsRequired || '—'}</p>
                  </div>

                  {/* بيانات العضو */}
                  <div className="absolute bottom-[8%] right-[5.5%] max-w-[46%] text-right">
                    <p className="text-[clamp(9px,1.05vw,14px)] font-bold text-white/70 drop-shadow">اسم العضو</p>
                    <h3 className="mt-1 truncate text-[clamp(18px,2.8vw,38px)] font-black drop-shadow-lg">{profile.name?.trim() || 'ضيف فايبز'}</h3>
                    <p className="mt-2 text-[clamp(10px,1.35vw,18px)] font-black tracking-wide drop-shadow-lg">
                      {formatMembershipNumber(profile.membership_number)}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="absolute bottom-[7%] left-[5%] rounded-2xl bg-white p-1.5 shadow-xl">
                    {profile.membership_qr_token ? (
                      <QRCodeSVG
                        value={`VIB-MEMBER:${profile.membership_qr_token}`}
                        size={150}
                        level="M"
                        className="h-[clamp(72px,14vw,150px)] w-[clamp(72px,14vw,150px)]"
                      />
                    ) : (
                      <div className="grid h-[clamp(72px,14vw,150px)] w-[clamp(72px,14vw,150px)] place-items-center text-center text-xs font-bold text-vibes-800">
                        QR غير مفعّل
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* شريط سفلي للجوال */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-vibes-100 bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="grid size-12 place-items-center rounded-2xl border border-vibes-200 text-vibes-800"
            >
              <ImagePlus className="size-5" />
            </button>
            <button onClick={() => void undo()} className="grid size-12 place-items-center rounded-2xl border border-vibes-200 text-vibes-800">
              <Undo2 className="size-5" />
            </button>
            <button onClick={() => void redo()} className="grid size-12 place-items-center rounded-2xl border border-vibes-200 text-vibes-800">
              <Redo2 className="size-5" />
            </button>
            <button
              onClick={() => void saveDesign(false)}
              disabled={saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-vibes-800 font-black text-white disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
              حفظ
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
