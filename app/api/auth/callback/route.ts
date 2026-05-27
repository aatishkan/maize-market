import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase auth callback handler.
 * Called after the user clicks the email verification link.
 * Exchanges the one-time code for a session and redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Allow a `next` param to redirect after login (e.g., deep linking)
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to home with prompt to set move-in date on first visit.
      // The prompt_move_in param is detected by the main layout.
      const destination = next === '/' ? `${origin}/?prompt_move_in=1` : `${origin}${next}`;
      return NextResponse.redirect(destination);
    }
  }

  // Something went wrong — send back to login with an error message
  return NextResponse.redirect(
    `${origin}/login?error=verification_failed`
  );
}
