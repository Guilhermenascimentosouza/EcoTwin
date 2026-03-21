import { supabase } from '../lib/supabaseClient';

async function authedFetch(url, { accessToken, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return json;
}

export async function fetchMarketListings() {
  if (!supabase) throw new Error('Supabase is not configured.');
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
  if (!supabase) throw new Error('Supabase is not configured.');
  if (isForSale && (typeof askingPrice === 'undefined' || askingPrice === null || Number(askingPrice) <= 0)) {
    throw new Error('Missing asking price');
  }
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

export async function transferOwnership({ twinId }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  return authedFetch('/api/market-transfer-ownership', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ twinId })
  });
}

export async function createMarketCheckoutSession({ twinId }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  return authedFetch('/api/market-checkout-session', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ twinId })
  });
}
