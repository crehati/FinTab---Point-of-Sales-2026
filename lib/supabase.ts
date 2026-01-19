// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION REGISTRY CREDENTIALS
 * Hardcoded as primary source for maximum resilience.
 */
const DEFAULT_URL = "https://tjyejgjwukycsurqanrv.supabase.co";
const DEFAULT_KEY = "sb_publishable_VtozfZO1UluSBg70I9JQHA_9-OLY_0Y";

/**
 * Supabase Client Instance
 * Directly initialized to prevent "TypeError: Failed to fetch" during 
 * asynchronous config discovery.
 */
export const supabase = createClient(DEFAULT_URL, DEFAULT_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: { 'x-application-name': 'fintab-node' }
  }
});

/**
 * Compatibility helper for components using the previous async pattern.
 * Resolves immediately with the active client.
 */
(supabase as any).wait = async () => {
    return supabase;
};

/**
 * Connectivity Diagnostics
 */
export const isSupabaseActive = () => !!supabase;

export default supabase;