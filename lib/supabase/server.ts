import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client.
 * Call inside Server Components, Server Actions, and Route Handlers.
 * cookies() is async in Next.js 16 — must await.
 *
 * Note: Not generically typed with Database here because supabase-js v2
 * requires the exact Relationships metadata that's only available from
 * `supabase gen types`. Cast query results to domain types from @/types/database.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — middleware handles session refresh.
          }
        },
      },
    }
  );
}
