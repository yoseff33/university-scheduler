"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import type { CartItem, Profile } from "@/lib/types";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(hasSupabaseConfig);

  async function loadProfile(current: Session | null) {
    if (!current) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase.from("profiles")
        .select("id,member_number,full_name,phone,preferred_branch_id,status")
        .eq("id", current.user.id)
        .maybeSingle(),
      supabase.rpc("current_role_codes"),
    ]);
    setProfile(profileData as Profile | null);
    setRoles(Array.isArray(roleData) ? roleData : []);
    setLoading(false);
  }

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => ({
    session,
    profile,
    roles,
    loading,
    refreshProfile: async () => loadProfile(session),
  }), [session, profile, roles, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const storageReady = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem("coffee-cart");
        if (saved) setItems(JSON.parse(saved) as CartItem[]);
      } catch {
        setItems([]);
      } finally {
        storageReady.current = true;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady.current) return;
    window.sessionStorage.setItem("coffee-cart", JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartState>(() => ({
    items,
    add: (item) => setItems((current) => {
      const key = `${item.product_id}:${item.option_value_ids.slice().sort().join(",")}:${item.note ?? ""}`;
      const existing = current.find((entry) => entry.key === key);
      return existing
        ? current.map((entry) => entry.key === key
          ? { ...entry, quantity: Math.min(entry.quantity + item.quantity, 20) }
          : entry)
        : [...current, { ...item, key }];
    }),
    updateQuantity: (key, quantity) => setItems((current) =>
      current.map((item) => item.key === key
        ? { ...item, quantity: Math.max(1, Math.min(quantity, 20)) }
        : item)),
    remove: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth خارج AuthProvider");
  return value;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart خارج CartProvider");
  return value;
}
