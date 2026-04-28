import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: 'netwrkr-auth',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

window.__supabase = supabase;