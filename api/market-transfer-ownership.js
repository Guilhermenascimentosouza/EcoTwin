import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return json(res, 500, { error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY' });
  if (!serviceRole) return json(res, 500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(res, 401, { error: 'Missing Authorization bearer token' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const twinId = body?.twinId;
  if (!twinId) return json(res, 400, { error: 'Missing twinId' });

  const authed = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await authed.auth.getUser(token);
  if (userError || !userData?.user) return json(res, 401, { error: 'Invalid token' });

  const buyerId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: twin, error: twinError } = await admin
    .from('digital_twins')
    .select('id,current_owner_id,is_for_sale,asking_price')
    .eq('id', twinId)
    .maybeSingle();

  if (twinError) return json(res, 500, { error: twinError.message });
  if (!twin) return json(res, 404, { error: 'Twin not found' });

  if (!twin.is_for_sale) return json(res, 400, { error: 'This item is not for sale' });
  if (!twin.asking_price || Number(twin.asking_price) <= 0) return json(res, 400, { error: 'Missing asking price' });
  if (!twin.current_owner_id) return json(res, 400, { error: 'Missing current owner' });
  if (twin.current_owner_id === buyerId) return json(res, 400, { error: 'Cannot buy your own item' });

  const price = Number(twin.asking_price);
  const serviceFee = Math.round(price * 0.03 * 100) / 100;

  const { data: tx, error: txError } = await admin
    .from('transactions')
    .insert({
      twin_id: twinId,
      seller_id: twin.current_owner_id,
      buyer_id: buyerId,
      price,
      service_fee: serviceFee,
      status: 'completed'
    })
    .select('id')
    .single();

  if (txError) return json(res, 500, { error: txError.message });

  const { error: updateError } = await admin
    .from('digital_twins')
    .update({
      current_owner_id: buyerId,
      is_for_sale: false,
      asking_price: null
    })
    .eq('id', twinId);

  if (updateError) return json(res, 500, { error: updateError.message });

  return json(res, 200, { ok: true, transactionId: tx?.id });
}
