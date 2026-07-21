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
    currentConfig.url.startsWith('http') &&
    currentConfig.url !== 'https://placeholder-url-for-compilation.supabase.co'
  );
};
