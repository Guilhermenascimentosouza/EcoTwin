import { supabase } from '../lib/supabaseClient';

export async function fetchMarketListings() {
  const { data, error } = await supabase
    .from('digital_twins')
    .select(
      [
        'id',
        'current_owner_id',
        'condition',
        'carbon_saved_kg',
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
    .eq('is_for_sale', true)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setTwinForSale({ twinId, isForSale, askingPrice }) {
  const patch = { is_for_sale: isForSale };
  if (typeof askingPrice !== 'undefined') patch.asking_price = askingPrice;

  const { data, error } = await supabase
    .from('digital_twins')
    .update(patch)
    .eq('id', twinId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
