// src/services/profileService.ts
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export async function getMyProfile(userId: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, phone, membership_number, name, avatar_url, preferred_branch_id, marketing_consent, loyalty_points, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateMyProfile(input: {
  name: string | null
  avatarPath: string | null
  marketingConsent: boolean
}): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.rpc('update_my_profile', {
    p_name: input.name,
    p_avatar_url: input.avatarPath,
    p_marketing_consent: input.marketingConsent,
  })

  if (error) throw error
  return data
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) throw new Error('نوع الصورة غير مدعوم')
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة أكبر من 5MB')

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
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.storage.from('avatars').remove([path])
  if (error) throw error
}
