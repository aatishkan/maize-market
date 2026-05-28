import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Supabase auth callback handler.
 * Handles two flows:
 *  1. PKCE  — email link contains ?code=xxx (default with @supabase/ssr)
 *  2. OTP   — email link contains ?token_hash=xxx&type=signup (fallback when
 *             the PKCE verifier cookie is absent, e.g. different device/tab)
 *
 * IMPORTANT: `exchangeCodeForSession` and `verifyOtp` write the session tokens
 * via `setAll`, but if we return `NextResponse.redirect()` the browser never
 * sees those Set-Cookie headers because it's a brand-new response object.
 * The fix is to collect the cookies ourselves and attach them to the redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code      = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type      = searchParams.get('type') as EmailOtpType | null;
  // Deep-linking: honour an explicit `next` param, otherwise land on /listings.
  const next = searchParams.get('next') ?? '/listings';

  const cookieStore = await cookies();

  // Collect every cookie that the auth exchange wants to write.
  // We'll set them on the redirect response so the browser actually gets them.
  const pendingCookies: { name: string; value: string; options: object }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          // Do NOT write to cookieStore here — those writes go on the internal
          // response object, not on the NextResponse.redirect() we return.
          cookiesToSet.forEach((c) => pendingCookies.push(c));
        },
      },
    }
  );

  let verified = false;

  if (code) {
    // PKCE flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type) {
    // OTP / magic-link flow
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
  }

  if (verified) {
    // Guard against open-redirect: only allow same-origin `next` values.
    const destination = next.startsWith('/') ? `${origin}${next}` : `${origin}/listings`;
    const response = NextResponse.redirect(destination);

    // ← THE CRITICAL FIX: attach the session cookies to the redirect so the
    //   browser stores them before navigating to `destination`.
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    );

    return response;
  }

  // Code was missing, expired, or already used → back to login with a message.
  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
