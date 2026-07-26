// src/features/auth/AuthContext.tsx
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // إذا لم يكن Supabase مهيأ، نوقف التحميل فوراً
    if (!supabase) {
      setLoading(false)
      return
    }

    let isMounted = true

    // جلب الجلسة الحالية عند التحميل
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          if (import.meta.env.DEV) console.error('Session lookup failed', error)
        }
        setSession(data.session)
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        if (import.meta.env.DEV) console.error('Unexpected error during session fetch', err)
        setLoading(false)
      })

    // الاستماع لتغييرات حالة المصادقة
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setLoading(false)
      }
    })

    // دالة التنظيف: إلغاء الاشتراك مع التحقق من وجود listener
    return () => {
      isMounted = false
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(() => ({ session, loading, signOut }), [session, loading, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
