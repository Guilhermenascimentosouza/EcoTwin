import { supabase } from '../lib/supabaseClient';

export async function logAffiliateClick({ userId, twinId, productId, offerKey, offerProvider, offerUrl }) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: userId ?? null,
      type: 'affiliate.click',
      twin_id: twinId ?? null,
      product_id: productId ?? null,
      data: {
        offer_key: offerKey,
        provider: offerProvider,
        url: offerUrl
      }
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
