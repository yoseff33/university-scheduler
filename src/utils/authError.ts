const phoneProviderErrors = [
  'phone provider',
  'sms provider',
  'unsupported phone',
  'phone signups are disabled',
  'phone login is disabled',
]

export function getArabicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalized = message.toLowerCase()

  if (phoneProviderErrors.some((item) => normalized.includes(item))) {
    return 'تسجيل الدخول برقم الجوال غير مفعّل حالياً.'
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'تم طلب رموز كثيرة. انتظر شوي ثم جرّب مرة ثانية.'
  }

  if (normalized.includes('token has expired') || normalized.includes('otp expired')) {
    return 'انتهت صلاحية رمز التحقق. اطلب رمز جديد.'
  }

  if (normalized.includes('invalid') && normalized.includes('token')) {
    return 'رمز التحقق غير صحيح.'
  }

  return 'تعذّر تنفيذ العملية. تأكد من إعداد Supabase ومزوّد الرسائل ثم جرّب مرة ثانية.'
}
