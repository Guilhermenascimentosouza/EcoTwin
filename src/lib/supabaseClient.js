import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnvError = (!supabaseUrl || !supabaseAnonKey)
  ? 'Missing Supabase env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY'
  : null;

export const supabase = supabaseEnvError ? null : createClient(supabaseUrl, supabaseAnonKey);
