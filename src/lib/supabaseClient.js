import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let envError = null;
let client = null;

if (!supabaseUrl || !supabaseAnonKey) {
  envError = 'Missing Supabase env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY';
} else {
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      envError = 'Invalid VITE_SUPABASE_URL: Must be a valid HTTP or HTTPS URL.';
    }
  } catch {
    envError = 'Invalid VITE_SUPABASE_URL: Must be a valid HTTP or HTTPS URL.';
  }

  if (!envError) {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      envError = e instanceof Error ? e.message : 'Failed to initialize Supabase client.';
      client = null;
    }
  }
}

export const supabaseEnvError = envError;
export const supabase = client;
