import { createClient } from '@supabase/supabase-js';

// Flexible helper to read environment variables across Vite import.meta.env and Node/Vercel process.env
const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] || '';
    }
  } catch (e) {}

  try {
    if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV[key]) {
      return (window as any).__ENV[key];
    }
  } catch (e) {}

  return '';
};

export const getStoredSupabaseConfig = () => {
  const envUrl = getEnvVar('VITE_SUPABASE_URL');
  const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

  if (typeof window === 'undefined') {
    return { url: envUrl, key: envKey };
  }

  const storedUrl = localStorage.getItem('supabase_temp_url');
  const storedKey = localStorage.getItem('supabase_temp_key');

  return {
    url: storedUrl && storedUrl.trim() !== '' ? storedUrl.trim() : envUrl.trim(),
    key: storedKey && storedKey.trim() !== '' ? storedKey.trim() : envKey.trim(),
  };
};

const config = getStoredSupabaseConfig();

// Resilient Mock client builder to protect React from crashing on any .auth or .from call
const createMockClient = (): any => {
  const defaultAuthResponse = Promise.resolve({ data: { session: null, user: null, subscription: { unsubscribe: () => {} } }, error: null });
  const defaultQueryResponse = Promise.resolve({ data: [], error: null });
  const defaultMutationResponse = Promise.resolve({ data: null, error: null });

  const chainable: any = {
    select: () => chainable,
    insert: () => defaultMutationResponse,
    update: () => chainable,
    delete: () => chainable,
    eq: () => defaultMutationResponse,
    in: () => defaultMutationResponse,
    order: () => defaultQueryResponse,
    single: () => defaultMutationResponse,
    maybeSingle: () => defaultMutationResponse,
    then: (resolve: any, reject?: any) => defaultQueryResponse.then(resolve, reject),
    catch: (reject: any) => defaultQueryResponse.catch(reject),
  };

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => defaultAuthResponse,
      signUp: () => defaultAuthResponse,
      signOut: () => defaultAuthResponse,
      signInWithOAuth: () => defaultAuthResponse,
    },
    from: () => chainable,
  };
};

const createSafeClient = (url: string, key: string) => {
  const trimmedUrl = url ? url.trim() : '';
  const trimmedKey = key ? key.trim() : '';

  if (
    !trimmedUrl ||
    !trimmedKey ||
    !trimmedUrl.startsWith('http') ||
    trimmedUrl === 'https://placeholder-url-for-compilation.supabase.co' ||
    trimmedKey === 'placeholder-key-for-compilation'
  ) {
    return createMockClient();
  }

  try {
    return createClient(trimmedUrl, trimmedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (e) {
    console.warn('Supabase initialization failed, falling back to mock client:', e);
    return createMockClient();
  }
};

export const supabase = createSafeClient(config.url, config.key);

export const getSupabaseClient = () => {
  const currentConfig = getStoredSupabaseConfig();
  if (currentConfig.url && currentConfig.key && currentConfig.url.startsWith('http')) {
    return createSafeClient(currentConfig.url, currentConfig.key);
  }
  return supabase;
};

export const isSupabaseConfigured = () => {
  const currentConfig = getStoredSupabaseConfig();
  return (
    !!currentConfig.url &&
    !!currentConfig.key &&
    currentConfig.url.trim().startsWith('http') &&
    currentConfig.url !== 'https://placeholder-url-for-compilation.supabase.co'
  );
};
