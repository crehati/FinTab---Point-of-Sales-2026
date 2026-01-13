// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const getEnvValue = (key: string): string | undefined => {
  try {
    const viteEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : undefined;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
    
    const nodeEnv = (typeof process !== 'undefined' && process && process.env) ? process.env : undefined;
    if (nodeEnv && nodeEnv[key]) return nodeEnv[key];
  } catch (e) {}
  return undefined;
};

let supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
let supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

let clientInstance: any = null;
let initializationPromise: Promise<any> | null = null;

const isValidUrl = (url: string) => {
    try { return !!new URL(url); } catch (e) { return false; }
};

const initializeClient = (url: string, key: string) => {
  if (!url || !key || !isValidUrl(url)) {
      console.warn('[FinTab Integrity] Invalid or missing Supabase credentials.');
      return null;
  }
  try {
    const client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    console.info(`[FinTab Integrity] Supabase node live at: ${url}`);
    return client;
  } catch (err) {
    console.error('[FinTab Integrity] Driver initialization failed:', err);
    return null;
  }
};

// Immediate init if env exists
if (supabaseUrl && supabaseAnonKey) {
  clientInstance = initializeClient(supabaseUrl, supabaseAnonKey);
}

const getClient = async () => {
  if (clientInstance) return clientInstance;
  
  if (!initializationPromise) {
    console.info('[FinTab Integrity] Attempting secure fallback via /runtime-config.json...');
    initializationPromise = fetch('/runtime-config.json')
      .then(r => r.json())
      .then(config => {
        clientInstance = initializeClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY);
        return clientInstance;
      })
      .catch(err => {
        console.error('[FinTab Integrity] Critical: Node config unavailable.', err);
        return null;
      });
  }
  return initializationPromise;
};

/**
 * Proxy for Supabase
 * Ensures methods are bound to the client instance to prevent "Cannot read rest of undefined" errors.
 */
const supabaseProxy = new Proxy({} as any, {
  get: (target, prop) => {
    if (prop === 'isInitialized') return !!clientInstance;
    if (prop === 'wait') return getClient;

    // If client is ready, return real property (bound if function)
    if (clientInstance) {
        const val = clientInstance[prop];
        return typeof val === 'function' ? val.bind(clientInstance) : val;
    }

    // Special handling for Auth before initialization to prevent mount crashes
    if (prop === 'auth') {
      return {
        getSession: () => getClient().then(c => c?.auth.getSession() || { data: { session: null }, error: null }),
        onAuthStateChange: (cb) => {
          getClient().then(c => c?.auth.onAuthStateChange(cb));
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: () => getClient().then(c => c?.auth.signOut())
      };
    }

    // Fallback for database methods before initialization
    // WARNING: Chaining will fail if this is hit. App.tsx must await supabase.wait()
    return (...args: any[]) => {
      console.warn(`[FinTab] Calling supabase.${String(prop)} before initialization. Chaining will fail.`);
      return getClient().then(client => {
        if (!client) throw new Error("FinTab Terminal Error: Supabase node not initialized.");
        const method = client[prop];
        return typeof method === 'function' ? method.bind(client)(...args) : method;
      });
    };
  }
});

export const isSupabaseActive = () => !!clientInstance;
export const supabase = supabaseProxy;
export default supabase;
