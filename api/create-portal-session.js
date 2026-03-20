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
  if (!supabaseUrl || !supabaseAnonKey) return json(res, 500, { error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY' });
  if (!process.env.STRIPE_SECRET_KEY) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(res, 401, { error: 'Missing Authorization bearer token' });

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return json(res, 401, { error: 'Invalid token' });

  const user = userData.user;
  const origin = req.headers.origin || process.env.PUBLIC_APP_URL;
  if (!origin) return json(res, 500, { error: 'Missing origin/PUBLIC_APP_URL' });

  const { data: profileData } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  let customerId = profileData?.stripe_customer_id || null;

  if (!customerId) {
    // Find Stripe customer by email (fallback approach)
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return json(res, 400, { error: 'No Stripe customer found for this user yet.' });
    customerId = customer.id;
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: origin
  });

  return json(res, 200, { url: portal.url });
}
