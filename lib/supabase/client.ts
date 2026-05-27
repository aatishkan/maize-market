import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Call inside Client Components ('use client').
 *
 * Note: Not generically typed with Database here because supabase-js v2
 * requires the exact Relationships metadata that's only available from
 * `supabase gen types`. Cast query results to domain types from @/types/database.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
