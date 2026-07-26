import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { appConfig } from './config'

export const supabase = appConfig.isSupabaseConfigured
  ? createClient<Database>(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
