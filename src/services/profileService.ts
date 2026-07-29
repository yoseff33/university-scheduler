import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

function normalizeProfile(
  value: Partial<Profile> | null | undefined,
  fallbackId = '',
): Profile {
  const now = new Date().toISOString()

  return {
    id: typeof value?.id === 'string' ? value.id : fallbackId,
    phone: typeof value?.phone === 'string' ? value.phone : null,
    membership_number:
      typeof value?.membership_number === 'string' ? value.membership_number : '',
    membership_qr_token:
      typeof value?.membership_qr_token === 'string' ? value.membership_qr_token : '',
    name: typeof value?.name === 'string' ? value.name : null,
    avatar_url: typeof value?.avatar_url === 'string' ? value.avatar_url : null,
    preferred_branch_id:
      typeof value?.preferred_branch_id === 'string' ? value.preferred_branch_id : null,
    marketing_consent: value?.marketing_consent === true,
    loyalty_points:
      typeof value?.loyalty_points === 'number' && Number.isFinite(value.loyalty_points)
        ? value.loyalty_points
        : 0,
    created_at: typeof value?.created_at === 'string' ? value.created_at : now,
    updated_at: typeof value?.updated_at === 'string' ? value.updated_at : now,
  }
}

function unwrapProfileResult(value: unknown): Partial<Profile> | null {
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === 'object' ? (first as Partial<Profile>) : null
  }

  return value && typeof value === 'object' ? (value as Partial<Profile>) : null
}

export async function getMyProfile(userId: string): Promise<Profile> {
  if (!supabase) throw new Error('خدمة Supabase غير مفعلة')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('الملف الشخصي غير موجود')

  return normalizeProfile(data, userId)
}

export async function updateMyProfile(input: {
  name: string | null
  avatarPath: string | null
  marketingConsent: boolean
}): Promise<Profile> {
  if (!supabase) throw new Error('خدمة Supabase غير مفعلة')

  const { data, error } = await supabase.rpc('update_my_profile', {
    p_name: input.name,
    p_avatar_url: input.avatarPath,
    p_marketing_consent: input.marketingConsent,
  })

  if (error) throw error

  const profile = unwrapProfileResult(data)
  if (!profile) throw new Error('لم ترجع دالة تحديث الحساب بيانات صالحة')

  return normalizeProfile(profile)
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('خدمة Supabase غير مفعلة')

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    throw new Error('نوع الصورة غير مدعوم')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الصورة أكبر من 5MB')
  }

  const extensionByMime: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }

  const extension = extensionByMime[file.type]
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: '3600',
  })

  if (error) throw error
  return path
}

export async function getAvatarSignedUrl(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null

  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60)

  if (error) return null
  return data.signedUrl
}

export async function removeAvatar(path: string): Promise<void> {
  if (!supabase) throw new Error('خدمة Supabase غير مفعلة')

  const { error } = await supabase.storage.from('avatars').remove([path])

  if (error) throw error
}
