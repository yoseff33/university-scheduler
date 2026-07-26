const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'فايبز',
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL?.trim() || window.location.origin,
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured:
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20,
} as const
