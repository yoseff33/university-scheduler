// src/services/loyaltyService.ts
import { supabase } from '../lib/supabase'

export interface LoyaltyCup {
  id: string
  customer_id: string
  order_id: string | null
  status: 'active' | 'redeemed' | 'revoked'
  created_at: string
  redeemed_at: string | null
}

export interface LoyaltyReward {
  id: string
  customer_id: string
  reward_code: string | null
  discount_value: number
  status: 'active' | 'used'
  created_at: string
  used_at: string | null
}

// دالة مساعدة للتحقق من وجود supabase
function getClient() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

export async function getActiveCups(userId: string): Promise<LoyaltyCup[]> {
  const client = getClient()
  const { data, error } = await (client as any)
    .from('loyalty_cups')
    .select('*')
    .eq('customer_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as LoyaltyCup[]) ?? []
}

export async function getAllCups(userId: string): Promise<LoyaltyCup[]> {
  const client = getClient()
  const { data, error } = await (client as any)
    .from('loyalty_cups')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as LoyaltyCup[]) ?? []
}

export async function getActiveRewards(userId: string): Promise<LoyaltyReward[]> {
  const client = getClient()
  const { data, error } = await (client as any)
    .from('loyalty_rewards')
    .select('*')
    .eq('customer_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as LoyaltyReward[]) ?? []
}

export async function grantCup(userId: string, orderId: string, orderTotal: number): Promise<LoyaltyCup> {
  const client = getClient()
  if (orderTotal < 12) {
    throw new Error('قيمة الطلب أقل من الحد الأدنى لمنح الكوب')
  }
  const { data, error } = await (client as any).rpc('grant_cup', {
    p_customer_id: userId,
    p_order_id: orderId,
    p_order_total: orderTotal,
  })
  if (error) throw error
  return data as LoyaltyCup
}

export async function redeemReward(userId: string): Promise<LoyaltyReward> {
  const client = getClient()
  const { data, error } = await (client as any).rpc('redeem_reward', {
    p_customer_id: userId,
  })
  if (error) throw error
  return data as LoyaltyReward
}

export async function revokeCup(cupId: string): Promise<void> {
  const client = getClient()
  const { error } = await (client as any).rpc('revoke_cup', {
    p_cup_id: cupId,
  })
  if (error) throw error
}
