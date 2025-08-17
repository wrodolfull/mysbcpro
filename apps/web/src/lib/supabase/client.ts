import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;
  
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
  
  if (!url || !anonKey) {
    throw new Error('Supabase env vars not set: SUPABASE_URL / SUPABASE_ANON_KEY');
  }
  
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}


