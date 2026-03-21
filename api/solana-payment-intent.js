import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function randomReference() {
  return crypto.randomBytes(16).toString('hex');
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
  const tokenSymbol = body?.token;

  if (!twinId) return json(res, 400, { error: 'Missing twinId' });
  if (tokenSymbol !== 'usdc' && tokenSymbol !== 'usdt') return json(res, 400, { error: 'Invalid token' });

  const authed = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await authed.auth.getUser(token);
  if (userError || !userData?.user) return json(res, 401, { error: 'Invalid token' });

  const buyerId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: buyerProfile, error: buyerProfileError } = await admin
    .from('profiles')
    .select('id,subscription_tier')
    .eq('id', buyerId)
    .maybeSingle();

  if (buyerProfileError) return json(res, 500, { error: buyerProfileError.message });

  const feePct = (buyerProfile?.subscription_tier === 'elite' || buyerProfile?.subscription_tier === 'brand') ? 0.03 : 0.05;

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

  const { data: sellerProfile, error: sellerProfileError } = await admin
    .from('profiles')
    .select('id,solana_usdc_address,solana_usdt_address')
    .eq('id', twin.current_owner_id)
    .maybeSingle();

  if (sellerProfileError) return json(res, 500, { error: sellerProfileError.message });

  const sellerAddress = tokenSymbol === 'usdc' ? sellerProfile?.solana_usdc_address : sellerProfile?.solana_usdt_address;
  if (!sellerAddress) return json(res, 400, { error: 'Seller has no Solana payout address for this token' });

  const reference = randomReference();
  const amount = Number(twin.asking_price);
  const serviceFee = Math.round(amount * feePct * 100) / 100;

  await admin
    .from('crypto_payment_intents')
    .update({ status: 'expired' })
    .eq('twin_id', twinId)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending');

  const { data: intent, error: intentError } = await admin
    .from('crypto_payment_intents')
    .insert({
      twin_id: twinId,
      seller_id: twin.current_owner_id,
      buyer_id: buyerId,
      token: tokenSymbol,
      amount,
      platform_fee_pct: feePct,
      service_fee: serviceFee,
      seller_address: sellerAddress,
      reference,
      status: 'pending'
    })
    .select('id,reference,amount,token,seller_address')
    .single();

  if (intentError) return json(res, 500, { error: intentError.message });

  return json(res, 200, {
    intent
  });
}
