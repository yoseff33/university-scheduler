export function getArabicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalized = message.toLowerCase()

  if (normalized.includes('missing_session')) {
    return 'تعذّر إنشاء جلسة الدخول. راجع إعدادات المصادقة في Supabase.'
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid_credentials')
  ) {
    return 'رقم الجوال أو كلمة المرور غير صحيحة.'
  }

  if (normalized.includes('phone not confirmed') || normalized.includes('phone_not_confirmed')) {
    return 'رقم الجوال غير مؤكد. عطّل Confirm phone في إعدادات Supabase إذا تبي الدخول بدون رمز تحقق.'
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('phone already registered') ||
    normalized.includes('phone_exists')
  ) {
    return 'رقم الجوال مسجل من قبل. اختر تسجيل الدخول بدل إنشاء حساب جديد.'
  }

  if (
    normalized.includes('weak password') ||
    normalized.includes('weak_password') ||
    normalized.includes('password should be')
  ) {
    return 'كلمة المرور ضعيفة. استخدم 8 خانات أو أكثر وتجنب الكلمات السهلة.'
  }

  if (
    normalized.includes('phone provider') ||
    normalized.includes('phone_provider_disabled') ||
    normalized.includes('phone signups are disabled') ||
    normalized.includes('phone login is disabled')
  ) {
    return 'الدخول برقم الجوال غير مفعّل في Supabase. فعّل Phone من Authentication Providers.'
  }

  if (normalized.includes('signup is disabled') || normalized.includes('signup_disabled')) {
    return 'إنشاء الحسابات الجديدة مقفل في إعدادات Supabase.'
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'تمت محاولات كثيرة. انتظر شوي ثم جرّب مرة ثانية.'
  }

  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'تعذّر الاتصال بالخدمة. تأكد من الإنترنت وإعدادات Supabase.'
  }

  return 'تعذّر تنفيذ العملية. راجع إعدادات Supabase ثم جرّب مرة ثانية.'
}
