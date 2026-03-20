import { supabase } from '../lib/supabaseClient';

export async function fetchMyProfile({ userId }) {
  if (!userId) return null;
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, subscription_tier, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}
