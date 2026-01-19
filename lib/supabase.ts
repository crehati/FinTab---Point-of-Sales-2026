// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION REGISTRY CREDENTIALS
 */
const DEFAULT_URL = "https://tjyejgjwukycsurqanrv.supabase.co";
const DEFAULT_KEY = "sb_publishable_VtozfZO1UluSBg70I9JQHA_9-OLY_0Y";

/**
 * Supabase Client Instance
 * Simplified configuration to maximize compatibility and minimize preflight (CORS) overhead.
 */
export const supabase = createClient(DEFAULT_URL, DEFAULT_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

/**
 * Compatibility helper for components using the previous async pattern.
 */
(supabase as any).wait = async () => {
    return supabase;
};

/**
 * Resilient Query Wrapper
 * Retries failed network requests to handle transient "Failed to fetch" errors.
 */
export const resilientQuery = async (queryFn: () => Promise<any>, maxRetries = 3) => {
  let lastError = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await queryFn();
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      lastError = err;
      // If it's a network error (Failed to fetch), wait and retry
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      // For other DB errors, throw immediately
      throw err;
    }
  }
  return { data: null, error: lastError };
};

export default supabase;