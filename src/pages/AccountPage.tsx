// src/pages/AccountPage.tsx
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Camera,
  Check,
  LoaderCircle,
  LogOut,
  QrCode,
  Save,
  ShieldCheck,
  UserRound,
  Home,
  ShoppingBag,
  ClipboardList,
  Award,
  Car,
  Palette,
  Users,
  Store,
  KeyRound,
  X,
  Upload,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { BrandMark } from '../components/BrandMark';
import { PageLoader } from '../components/PageLoader';
import { useAuth } from '../features/auth/useAuth';
import {
  getAvatarSignedUrl,
  getMyProfile,
  removeAvatar,
  updateMyProfile,
  uploadAvatar,
} from '../services/profileService';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { maskPhone } from '../utils/phone';

// --- الثوابت ---
const DEFAULT_CUPS_FOR_REWARD = 6; // القيمة الافتراضية إذا لم توجد إعدادات

// --- دالة مساعدة للتحقق من وجود supabase ---
function requireSupabase() {
  if (!supabase) {
    throw new Error('خدمة Supabase غير متاحة حالياً');
  }
  return supabase;
}

// --- حالة الصفحة باستخدام useReducer ---
interface AccountState {
  profile: Profile | null;
  name: string;
  marketingConsent: boolean;
  avatarUrl: string | null;
  pendingAvatar: File | null;
  previewUrl: string | null;
  userRole: string | null;
  activeCups: number;
  targetCups: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
}

type AccountAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PROFILE'; payload: Profile }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_MARKETING_CONSENT'; payload: boolean }
  | { type: 'SET_AVATAR_URL'; payload: string | null }
  | { type: 'SET_PENDING_AVATAR'; payload: File | null }
  | { type: 'SET_PREVIEW_URL'; payload: string | null }
  | { type: 'SET_USER_ROLE'; payload: string | null }
  | { type: 'SET_ACTIVE_CUPS'; payload: number }
  | { type: 'SET_TARGET_CUPS'; payload: number }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS'; payload: string | null }
  | { type: 'RESET_PENDING_AVATAR' };

const initialState: AccountState = {
  profile: null,
  name: '',
  marketingConsent: false,
  avatarUrl: null,
  pendingAvatar: null,
  previewUrl: null,
  userRole: null,
  activeCups: 0,
  targetCups: DEFAULT_CUPS_FOR_REWARD,
  loading: true,
  saving: false,
  error: null,
  success: null,
};

function accountReducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload, name: action.payload.name ?? '', marketingConsent: action.payload.marketing_consent };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_MARKETING_CONSENT':
      return { ...state, marketingConsent: action.payload };
    case 'SET_AVATAR_URL':
      return { ...state, avatarUrl: action.payload };
    case 'SET_PENDING_AVATAR':
      return { ...state, pendingAvatar: action.payload };
    case 'SET_PREVIEW_URL':
      return { ...state, previewUrl: action.payload };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'SET_ACTIVE_CUPS':
      return { ...state, activeCups: action.payload };
    case 'SET_TARGET_CUPS':
      return { ...state, targetCups: action.payload };
    case 'SET_SAVING':
      return { ...state, saving: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SUCCESS':
      return { ...state, success: action.payload };
    case 'RESET_PENDING_AVATAR':
      return { ...state, pendingAvatar: null, previewUrl: null };
    default:
      return state;
  }
}

// --- Hook مخصص لجلب بيانات الحساب (مع دعم الإلغاء) ---
function useProfileData(userId: string) {
  const [state, dispatch] = useReducer(accountReducer, initialState);

  useEffect(() => {
    if (!userId) return;
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const supabaseClient = requireSupabase();

        // 1. جلب الملف الشخصي
        const profile = await getMyProfile(userId);
        if (signal.aborted) return;
        dispatch({ type: 'SET_PROFILE', payload: profile });

        // 2. جلب الصورة
        const signedUrl = await getAvatarSignedUrl(profile.avatar_url);
        if (!signal.aborted) {
          dispatch({ type: 'SET_AVATAR_URL', payload: signedUrl });
        }

        // 3. جلب دور المستخدم
        const { data: roleData, error: roleError } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (!signal.aborted && !roleError && roleData) {
          dispatch({ type: 'SET_USER_ROLE', payload: roleData.role });
        }

        // 4. جلب الأكواب النشطة من loyalty_accounts (الآن الأنواع محدثة)
        const { data: loyaltyData, error: loyaltyError } = await supabaseClient
          .from('loyalty_accounts')
          .select('active_cups')
          .eq('user_id', userId)
          .maybeSingle();

        if (!signal.aborted) {
          if (loyaltyError) {
            console.warn('Loyalty fetch error:', loyaltyError);
          } else {
            dispatch({ type: 'SET_ACTIVE_CUPS', payload: loyaltyData?.active_cups ?? 0 });
          }
        }

        // 5. جلب الهدف من loyalty_settings (استخدم cups_required)
        const { data: settingsData, error: settingsError } = await supabaseClient
          .from('loyalty_settings')
          .select('cups_required')
          .maybeSingle();

        if (!signal.aborted) {
          if (settingsError) {
            console.warn('Settings fetch error:', settingsError);
          } else {
            dispatch({ type: 'SET_TARGET_CUPS', payload: settingsData?.cups_required ?? DEFAULT_CUPS_FOR_REWARD });
          }
        }
      } catch (err: unknown) {
        if (!signal.aborted) {
          console.error(err);
          const message = err instanceof Error ? err.message : 'تعذّر تحميل الملف الشخصي. تأكد من اتصالك بالإنترنت.';
          dispatch({ type: 'SET_ERROR', payload: message });
        }
      } finally {
        if (!signal.aborted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [userId]);

  return { state, dispatch };
}

// --- مكون تغيير كلمة المرور (مودال) ---
function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetFields = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 محارف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabaseClient = requireSupabase();
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير كلمة المرور.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-vibes-900">تغيير كلمة المرور</h3>
          <button onClick={handleClose} className="rounded-full p-2 hover:bg-vibes-100">
            <X className="size-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-vibes-800">كلمة المرور الجديدة</label>
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-vibes-200 px-4 font-medium"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-vibes-800">تأكيد كلمة المرور</label>
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-vibes-200 px-4 font-medium"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <button
            type="submit"
            className="h-12 w-full rounded-2xl bg-vibes-800 font-black text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? <LoaderCircle className="mx-auto size-5 animate-spin" /> : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- المكون الرئيسي ---
export function AccountPage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user.id ?? '';
  const fileInput = useRef<HTMLInputElement>(null);
  const { state, dispatch } = useProfileData(userId);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  const {
    profile,
    name,
    marketingConsent,
    avatarUrl,
    pendingAvatar,
    previewUrl,
    userRole,
    activeCups,
    targetCups,
    loading,
    saving,
    error,
    success,
  } = state;

  // دالة لتنسيق رقم العضوية – منع تكرار البادئة
  const formatMembership = useCallback((number: string | null | undefined): string => {
    if (!number) return '—';
    const trimmed = number.trim();
    if (trimmed.startsWith('VIB-')) return trimmed;
    return `VIB-${trimmed}`;
  }, []);

  const membershipLabel = useMemo(
    () => formatMembership(profile?.membership_number),
    [profile?.membership_number, formatMembership]
  );

  // قيمة QR – استخلاص الرقم بدون بادئة مكررة
  const qrValue = useMemo(() => {
    const number = profile?.membership_number;
    if (!number) return '';
    const clean = number.trim().startsWith('VIB-') ? number.trim().slice(4) : number.trim();
    return `VIB:${clean}`;
  }, [profile?.membership_number]);

  // حساب الأكواب المتبقية
  const cupsRemaining = Math.max(targetCups - activeCups, 0);
  const isEligible = activeCups >= targetCups;

  const selectAvatar = useCallback(
    (file: File | undefined) => {
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_SUCCESS', payload: null });
      if (!file) return;

      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        dispatch({ type: 'SET_ERROR', payload: 'اختر صورة PNG أو JPEG أو WebP.' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        dispatch({ type: 'SET_ERROR', payload: 'حجم الصورة لازم يكون 5MB أو أقل.' });
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      dispatch({ type: 'SET_PENDING_AVATAR', payload: file });
      dispatch({ type: 'SET_PREVIEW_URL', payload: URL.createObjectURL(file) });
    },
    [previewUrl]
  );

  const saveProfile = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!profile || !userId) return;

      dispatch({ type: 'SET_SAVING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_SUCCESS', payload: null });

      let uploadedAvatarPath: string | null = null;

      try {
        let avatarPath = profile.avatar_url;
        if (pendingAvatar) {
          uploadedAvatarPath = await uploadAvatar(userId, pendingAvatar);
          avatarPath = uploadedAvatarPath;
        }

        const previousAvatarPath = profile.avatar_url;
        const updated = await updateMyProfile({
          name: name.trim() || null,
          avatarPath,
          marketingConsent,
        });

        if (uploadedAvatarPath && previousAvatarPath && previousAvatarPath !== uploadedAvatarPath) {
          void removeAvatar(previousAvatarPath).catch((cleanupError) => {
            console.warn('Old avatar cleanup failed', cleanupError);
          });
        }

        dispatch({ type: 'SET_PROFILE', payload: updated });
        dispatch({ type: 'RESET_PENDING_AVATAR' });
        const newSignedUrl = await getAvatarSignedUrl(updated.avatar_url);
        dispatch({ type: 'SET_AVATAR_URL', payload: newSignedUrl });
        dispatch({ type: 'SET_SUCCESS', payload: 'تم حفظ بيانات حسابك بنجاح.' });
      } catch (err: unknown) {
        if (uploadedAvatarPath) {
          void removeAvatar(uploadedAvatarPath).catch(() => undefined);
        }
        console.error(err);
        let message = 'ما قدرنا نحفظ التعديلات. راجع إعدادات Storage و RLS.';
        if (err instanceof Error && err.message.includes('5MB')) {
          message = err.message;
        }
        dispatch({ type: 'SET_ERROR', payload: message });
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false });
      }
    },
    [profile, userId, pendingAvatar, name, marketingConsent]
  );

  const handleSignOut = useCallback(async () => {
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'تعذّر تسجيل الخروج. جرّب مرة ثانية.';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, [signOut, navigate, dispatch]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) return <PageLoader label="جاري تحميل حساب فايبز..." />;

  return (
    <main className="min-h-screen bg-vibes-pattern safe-bottom pb-20">
      {/* الهيدر */}
      <header className="sticky top-0 z-20 border-b border-vibes-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-vibes-200 bg-white px-4 py-2.5 text-sm font-black text-vibes-800 transition hover:bg-vibes-50"
            >
              <KeyRound className="size-4" />
              تغيير كلمة المرور
            </button>
            <Link
              to="/home"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-vibes-200 bg-white px-4 py-2.5 text-sm font-black text-vibes-800 transition hover:bg-vibes-50"
            >
              <Home className="size-4" />
              الرئيسية
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-2xl border border-vibes-200 bg-white px-4 py-2.5 text-sm font-black text-vibes-800 transition hover:bg-vibes-50"
            >
              <LogOut className="size-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        {error && (
          <div className="mb-5">
            <Alert type="error">{error}</Alert>
          </div>
        )}
        {success && (
          <div className="mb-5">
            <Alert type="success">{success}</Alert>
          </div>
        )}

        {/* روابط سريعة */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            to="/menu"
            className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <ShoppingBag className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">المنيو</span>
          </Link>
          <Link
            to="/orders"
            className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <ClipboardList className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">طلباتي</span>
          </Link>
          <Link
            to="/loyalty"
            className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <Award className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">الولاء</span>
          </Link>
          <Link
            to="/cars"
            className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <Car className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">سياراتي</span>
          </Link>
          <Link
            to="/card-designer"
            className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <Palette className="size-5 text-vibes-700" />
            <span className="text-sm font-bold text-vibes-900">تصميم البطاقة</span>
          </Link>
          {['cashier', 'branch_manager', 'admin', 'super_admin'].includes(userRole ?? '') && (
            <Link
              to="/cashier"
              className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <Users className="size-5 text-vibes-700" />
              <span className="text-sm font-bold text-vibes-900">الكاشير</span>
            </Link>
          )}
          {['branch_manager', 'admin', 'super_admin'].includes(userRole ?? '') && (
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <Store className="size-5 text-vibes-700" />
              <span className="text-sm font-bold text-vibes-900">الإدارة</span>
            </Link>
          )}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* بطاقة العضوية */}
          <article className="overflow-hidden rounded-[2rem] bg-vibes-800 p-6 text-white card-shadow sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-bold text-vibes-200">بطاقة عضوية فايبز</p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  {profile?.name?.trim() || 'ضيف فايبز'}
                </h1>
                <p className="mt-2 font-semibold text-vibes-200">
                  {maskPhone(profile?.phone ?? null)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-vibes-700 px-3 py-1 text-xs font-bold text-vibes-200">
                    🏆 {activeCups} كوب
                  </span>
                  {targetCups > 0 && (
                    <span className="rounded-full bg-vibes-700 px-3 py-1 text-xs font-bold text-vibes-200">
                      🎯 الهدف {targetCups}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid size-24 place-items-center overflow-hidden rounded-3xl border border-white/20 bg-white/10">
                {previewUrl || avatarUrl ? (
                  <img
                    src={previewUrl || avatarUrl || ''}
                    alt="صورة العميل"
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-11 text-vibes-200" />
                )}
              </div>
            </div>

            <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-vibes-300">
                  رقم العضوية
                </p>
                <p className="mt-2 text-2xl font-black tracking-wide">{membershipLabel}</p>
              </div>
              <div
                className="rounded-2xl bg-white p-2 text-vibes-900"
                aria-label={`رمز عضوية ${membershipLabel}`}
              >
                {profile && qrValue ? (
                  <QRCodeSVG
                    value={qrValue}
                    size={88}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <QrCode className="size-20" />
                )}
              </div>
            </div>

            {/* شريط تقدم الأكواب – مع اتجاه RTL */}
            <div className="mt-6">
              <div className="flex justify-between text-xs font-bold text-vibes-200">
                <span>الأكواب النشطة</span>
                <span>{activeCups} / {targetCups}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-vibes-700" dir="rtl">
                <div
                  className="h-full rounded-full bg-vibes-300 transition-all duration-500"
                  style={{ width: `${Math.min((activeCups / targetCups) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-vibes-300">
                {isEligible
                  ? '🟢 مؤهل للحصول على كوب مجاني'
                  : `🔵 باقي لك ${cupsRemaining} كوب${cupsRemaining === 1 ? '' : 'ات'} للحصول على كوبك المجاني`}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-bold text-vibes-200">الأكواب النشطة</p>
                <p className="mt-2 text-sm font-black">{activeCups} كوب</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-bold text-vibes-200">الحالة</p>
                <p className="mt-2 text-sm font-black">
                  {isEligible ? '🟢 مؤهل' : '🔵 قيد التقدم'}
                </p>
              </div>
            </div>
          </article>

          {/* نموذج تحرير البيانات */}
          <form
            className="rounded-[2rem] border border-white bg-white/90 p-6 card-shadow sm:p-8"
            onSubmit={saveProfile}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-vibes-100 text-vibes-700">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-vibes-900">بيانات حسابي</h2>
                <p className="mt-1 text-sm text-vibes-600">
                  التعديل يتم عن طريق دالة آمنة، بدون السماح بتغيير رقم العضوية أو الدور.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-vibes-900">الاسم</span>
                <input
                  className="h-13 w-full rounded-2xl border border-vibes-200 bg-white px-4 font-bold text-vibes-900 focus:border-vibes-600"
                  maxLength={80}
                  value={name}
                  onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
                  placeholder="اكتب اسمك"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-black text-vibes-900">الصورة الشخصية</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => selectAvatar(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-vibes-300 bg-vibes-50 px-4 py-4 text-sm font-black text-vibes-800 transition hover:bg-vibes-100"
                  onClick={() => fileInput.current?.click()}
                >
                  <Camera className="size-5" />
                  اختيار صورة حتى 5MB
                </button>
                {pendingAvatar && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Upload className="size-4 text-vibes-600" />
                    <span className="text-vibes-700">
                      {pendingAvatar.name} ({(pendingAvatar.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-vibes-100 bg-vibes-50 p-4">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-vibes-700"
                  checked={marketingConsent}
                  onChange={(e) =>
                    dispatch({ type: 'SET_MARKETING_CONSENT', payload: e.target.checked })
                  }
                />
                <span>
                  <span className="block text-sm font-black text-vibes-900">
                    الموافقة على الرسائل التسويقية
                  </span>
                  <span className="mt-1 block text-xs leading-6 text-vibes-600">
                    لا يتم إرسال أي رسالة واتساب تسويقية قبل ربط الخدمة والحصول على موافقتك.
                  </span>
                </span>
              </label>
            </div>

            <button
              className="mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-vibes-800 px-5 font-black text-white transition hover:bg-vibes-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !profile}
            >
              {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
              حفظ التعديلات
            </button>
          </form>
        </section>

        {/* ملاحظة محدثة */}
        <section className="mt-8 rounded-3xl border border-vibes-100 bg-white/80 p-5">
          <div className="flex items-start gap-3">
            <Check className="mt-1 size-5 shrink-0 text-emerald-600" />
            <p className="text-sm leading-7 text-vibes-700">
              المعروض في هذه الصفحة يعتمد على بيانات حسابك وصلاحياتك المسجلة في Supabase.
            </p>
          </div>
        </section>
      </div>

      {/* مودال تغيير كلمة المرور */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => {
          dispatch({ type: 'SET_SUCCESS', payload: 'تم تغيير كلمة المرور بنجاح.' });
        }}
      />
    </main>
  );
}
