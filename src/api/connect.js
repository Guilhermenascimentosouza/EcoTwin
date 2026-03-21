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

export async function createConnectOnboardingLink() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  return authedFetch('/api/connect-onboard', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({})
  });
}
