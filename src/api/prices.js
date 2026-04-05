import { supabase } from '../lib/supabaseClient';

export async function fetchMarketPricesInternal({ productIds }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!productIds || productIds.length === 0) return [];

  const unique = Array.from(new Set(productIds.filter(Boolean)));
  if (unique.length === 0) return [];

  const { data, error } = await supabase
    .from('market_prices_internal')
    .select('product_id,avg_price,listings_count,last_updated')
    .in('product_id', unique);

  if (error) throw new Error(error.message);
  return data ?? [];
}
