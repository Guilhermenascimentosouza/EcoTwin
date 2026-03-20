import { supabase } from '../lib/supabaseClient';

export async function fetchTwinByDppId({ dppId }) {
  if (!dppId) return null;
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('products')
    .select('id, dpp_id')
    .eq('dpp_id', dppId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function registerTwinByDppId({ userId, dppId, condition }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!userId) throw new Error('Not authenticated');
  if (!dppId) throw new Error('Missing DPP ID');

  const product = await fetchTwinByDppId({ dppId });
  if (!product?.id) throw new Error('DPP not found in catalog');

  const { data, error } = await supabase
    .from('digital_twins')
    .insert({
      product_id: product.id,
      current_owner_id: userId,
      condition
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
