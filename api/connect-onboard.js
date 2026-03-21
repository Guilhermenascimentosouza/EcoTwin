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

  const authed = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await authed.auth.getUser(token);
  if (userError || !userData?.user) return json(res, 401, { error: 'Invalid token' });

  const user = userData.user;
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,stripe_connect_account_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return json(res, 500, { error: profileError.message });

  let accountId = profile?.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      email: user.email,
      metadata: {
        supabase_user_id: user.id
      }
    });
    accountId = account.id;

    const { error: updateError } = await admin
      .from('profiles')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', user.id);

    if (updateError) return json(res, 500, { error: updateError.message });
  }

  const refreshUrl = `${origin}/?connect=refresh`;
  const returnUrl = `${origin}/?connect=return`;

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  return json(res, 200, { url: link.url, accountId });
}
