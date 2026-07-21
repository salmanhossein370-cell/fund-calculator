import { createClient } from '@supabase/supabase-js';

const defaultUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const defaultKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const getStoredSupabaseConfig = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  return {
    url: localStorage.getItem('supabase_temp_url') || defaultUrl,
    key: localStorage.getItem('supabase_temp_key') || defaultKey,
  };
};

const config = getStoredSupabaseConfig();

export const supabase = createClient(
  config.url || 'https://placeholder-url-for-compilation.supabase.co',
  config.key || 'placeholder-key-for-compilation'
);

export const getSupabaseClient = () => {
  const currentConfig = getStoredSupabaseConfig();
  if (currentConfig.url && currentConfig.key) {
    return createClient(currentConfig.url, currentConfig.key);
  }
  return supabase;
};

export const isSupabaseConfigured = () => {
  const currentConfig = getStoredSupabaseConfig();
  return (
    !!currentConfig.url &&
    !!currentConfig.key &&
    currentConfig.url !== 'https://placeholder-url-for-compilation.supabase.co'
  );
};
