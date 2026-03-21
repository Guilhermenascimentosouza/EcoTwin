import { supabase } from '../lib/supabaseClient';

export async function fetchMyProfile({ userId }) {
  if (!userId) return null;
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, subscription_tier, full_name, avatar_url, stripe_connect_account_id, solana_usdc_address, solana_usdt_address')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function updateMyProfile({ patch }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const sanitizedPatch = { ...patch };
  delete sanitizedPatch.btc_address;

  const { data, error } = await supabase
    .from('profiles')
    .update(sanitizedPatch)
    .eq('id', userId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
