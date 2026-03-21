import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

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
  const origin = req.headers.origin || process.env.PUBLIC_APP_URL;

  if (!supabaseUrl || !supabaseAnonKey) return json(res, 500, { error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY' });
  if (!serviceRole) return json(res, 500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  if (!process.env.STRIPE_SECRET_KEY) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' });
  if (!origin) return json(res, 500, { error: 'Missing origin/PUBLIC_APP_URL' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(res, 401, { error: 'Missing Authorization bearer token' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const twinId = body?.twinId;
  if (!twinId) return json(res, 400, { error: 'Missing twinId' });

  const authed = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await authed.auth.getUser(token);
  if (userError || !userData?.user) return json(res, 401, { error: 'Invalid token' });

  const buyer = userData.user;
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: buyerProfile, error: buyerProfileError } = await admin
    .from('profiles')
    .select('id,subscription_tier')
    .eq('id', buyer.id)
    .maybeSingle();

  if (buyerProfileError) return json(res, 500, { error: buyerProfileError.message });

  const feePct = (buyerProfile?.subscription_tier === 'elite' || buyerProfile?.subscription_tier === 'brand') ? 0.03 : 0.05;

  const { data: twin, error: twinError } = await admin
    .from('digital_twins')
    .select('id,current_owner_id,is_for_sale,asking_price,product:products(name)')
    .eq('id', twinId)
    .maybeSingle();

  if (twinError) return json(res, 500, { error: twinError.message });
  if (!twin) return json(res, 404, { error: 'Twin not found' });
  if (!twin.is_for_sale) return json(res, 400, { error: 'This item is not for sale' });
  if (!twin.asking_price || Number(twin.asking_price) <= 0) return json(res, 400, { error: 'Missing asking price' });
  if (!twin.current_owner_id) return json(res, 400, { error: 'Missing current owner' });
  if (twin.current_owner_id === buyer.id) return json(res, 400, { error: 'Cannot buy your own item' });

  const { data: sellerProfile, error: sellerProfileError } = await admin
    .from('profiles')
    .select('id,stripe_connect_account_id')
    .eq('id', twin.current_owner_id)
    .maybeSingle();

  if (sellerProfileError) return json(res, 500, { error: sellerProfileError.message });
  if (!sellerProfile?.stripe_connect_account_id) return json(res, 400, { error: 'Seller is not onboarded to Stripe Connect' });

  const price = Number(twin.asking_price);
  const amountCents = Math.round(price * 100);
  const feeCents = Math.max(0, Math.round(amountCents * feePct));

  const productName = twin.product?.name || 'EcoTwin item';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: {
            name: productName
          }
        }
      }
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: {
        destination: sellerProfile.stripe_connect_account_id
      },
      metadata: {
        twin_id: twinId,
        buyer_id: buyer.id,
        seller_id: twin.current_owner_id,
        amount_cents: String(amountCents),
        fee_cents: String(feeCents),
        currency: 'eur'
      }
    },
    metadata: {
      twin_id: twinId,
      buyer_id: buyer.id,
      seller_id: twin.current_owner_id,
      amount_cents: String(amountCents),
      fee_cents: String(feeCents),
      currency: 'eur'
    },
    success_url: `${origin}/?market=success&twin=${encodeURIComponent(twinId)}`,
    cancel_url: `${origin}/?market=cancel&twin=${encodeURIComponent(twinId)}`
  });

  return json(res, 200, { url: session.url });
}
