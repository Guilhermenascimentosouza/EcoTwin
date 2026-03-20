import { supabase } from '../lib/supabaseClient';

export async function fetchVaultTwins({ userId }) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('digital_twins')
    .select(
      [
        'id',
        'condition',
        'carbon_saved_kg',
        'is_for_sale',
        'asking_price',
        'updated_at',
        'product:products (',
        '  id,',
        '  name,',
        '  category,',
        '  image_url,',
        '  dpp_id,',
        '  brand:brands ( name )',
        ')'
      ].join('\n')
    )
    .eq('current_owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
