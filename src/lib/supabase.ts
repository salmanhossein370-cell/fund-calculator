import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zhhkrbagcejxpgyspjqv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fUaDZRMgc9g3iPd8s-10RA_AjLrNqfA";

export const getStoredSupabaseConfig = () => {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
  };
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const getSupabaseClient = () => {
  return supabase;
};

export const isSupabaseConfigured = () => {
  return true;
};

