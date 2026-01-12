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
let configPromise: Promise<void> | null = null;

const initializeClient = (url: string, key: string) => {
  if (!url || !key) return;
  try {
    clientInstance = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    const maskedKey = key ? `***${key.slice(-6)}` : 'MISSING';
    console.info(`[FinTab Integrity] Supabase client ACTIVE. Target: ${url}, NodeKey: ${maskedKey}`);
  } catch (err) {
    console.error('[FinTab Integrity] Failed to initialize Supabase client:', err);
  }
};

if (supabaseUrl && supabaseAnonKey) {
  initializeClient(supabaseUrl, supabaseAnonKey);
} else {
  console.info('[FinTab Integrity] Attempting secure fallback via /runtime-config.json...');
  configPromise = fetch('/runtime-config.json')
    .then(r => r.json())
    .then(config => {
      if (config.VITE_SUPABASE_URL && config.VITE_SUPABASE_ANON_KEY) {
        initializeClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY);
      }
    })
    .catch(err => {
      console.error('[FinTab Integrity] Critical: Configuration node unavailable.', err);
    });
}

/**
 * Creates a deep proxy that preserves 'this' context for methods
 * and prevents crashing on internal property probing.
 */
const createDeepProxy = (path: string = 'supabase'): any => {
  const proxyTarget = (...args: any[]) => {
    const resolveCall = (client: any) => {
      const parts = path.split('.').slice(1);
      let target = client;
      let parent = null;
      
      for (const part of parts) {
        parent = target;
        if (target === undefined || target === null) break;
        target = target[part];
      }
      
      if (typeof target === 'function') {
        return target.apply(parent, args);
      }
      return target;
    };

    if (clientInstance) return resolveCall(clientInstance);
    
    return (configPromise || Promise.resolve()).then(() => {
      if (clientInstance) return resolveCall(clientInstance);
      return { data: null, error: { message: 'Supabase client not initialized' } };
    });
  };

  return new Proxy(proxyTarget, {
    get: (target, prop) => {
      // Return standard Promise methods as undefined to prevent Proxy-as-Promise confusion
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
      
      // Handle internal properties and probes immediately
      const internalProps = ['_debug', 'initializePromise', 'constructor', 'toJSON', 'prototype', '__proto__'];
      if (typeof prop === 'string' && (internalProps.includes(prop) || prop.startsWith('_'))) {
        if (clientInstance) {
          const parts = path.split('.').slice(1);
          let current = clientInstance;
          for (const part of parts) {
            if (current === undefined || current === null) break;
            current = current[part];
          }
          return current ? current[prop] : undefined;
        }
        return undefined;
      }
      
      return createDeepProxy(`${path}.${String(prop)}`);
    }
  });
};

export const isSupabaseActive = () => Boolean(clientInstance);
export const supabase = createDeepProxy();
export default supabase;