import { supabase } from '../lib/supabaseClient';

export async function validateDpp({ dppId }) {
  if (!dppId) return null;

  const { data, error } = await supabase
    .from('products')
    .select(
      [
        'id,',
        'name,',
        'category,',
        'image_url,',
        'dpp_id,',
        'brand:brands ( name )'
      ].join('\n')
    )
    .eq('dpp_id', dppId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}
