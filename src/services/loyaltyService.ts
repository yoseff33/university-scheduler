import { supabase } from '../lib/supabase';

export interface LoyaltyCup {
  id: string;
  customer_id: string;
  order_id: string | null;
  status: 'active' | 'redeemed' | 'revoked';
  created_at: string;
  redeemed_at: string | null;
}

export interface LoyaltyReward {
  id: string;
  customer_id: string;
  reward_code: string;
  discount_value: number;
  status: 'active' | 'used';
  created_at: string;
  used_at: string | null;
}

export async function getActiveCupsCount(userId: string): Promise<number> {
  if (!supabase) throw new Error('Supabase not configured');
  const { count, error } = await supabase
    .from('loyalty_cups')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .eq('status', 'active');
  if (error) throw error;
  return count || 0;
}

export async function getCupsAndRewards(userId: string) {
  if (!supabase) throw new Error('Supabase not configured');

  const [cupsRes, rewardsRes] = await Promise.all([
    supabase
      .from('loyalty_cups')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (cupsRes.error) throw cupsRes.error;
  if (rewardsRes.error) throw rewardsRes.error;

  return {
    cups: cupsRes.data as LoyaltyCup[],
    rewards: rewardsRes.data as LoyaltyReward[],
  };
}

export async function redeemReward(userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_customer_id: userId,
  });
  if (error) throw error;
  return data; // reward id
}

// هذه الدالة تُستدعى عند إتمام الطلب (يمكن دمجها مع خدمة الطلبات)
export async function grantCupForOrder(
  userId: string,
  orderId: string,
  orderTotal: number
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('grant_cup', {
    p_customer_id: userId,
    p_order_id: orderId,
    p_order_total: orderTotal,
  });
  if (error) throw error;
  return data; // cup id
}
