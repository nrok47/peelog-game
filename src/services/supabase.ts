import type { SupabaseClient } from '@supabase/supabase-js';
// NOTE: This file assumes you will install `@supabase/supabase-js` and provide env vars.
// It exports a nullable client and a helper to save battle logs.

let supabase: SupabaseClient | null = null;

export function initSupabase(createClient: (url: string, key: string) => SupabaseClient) {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '').trim();
  if (!url || !key) {
    console.warn('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    supabase = null;
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

export function getSupabase() {
  return supabase;
}

export async function saveBattleLog(tableName: string, payload: unknown) {
  if (!supabase) throw new Error('Supabase not initialized');
  // expect a table that accepts { payload: json }
  // @ts-ignore
  return await supabase.from(tableName).insert([{ payload }]);
}
