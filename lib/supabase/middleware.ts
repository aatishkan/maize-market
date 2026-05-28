import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Copies refreshed session cookies from a Supabase response onto a redirect
 * response.  Without this, any token refresh that happened during the middleware
 * call is silently lost whenever we redirect instead of passing `supabaseResponse`
 * straight through.
 */
function withSessionCookies(
  redirect: ReturnType<typeof NextResponse.redirect>,
  sessionResponse: NextResponse
): ReturnType<typeof NextResponse.redirect> {
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirect;
}

/**
 * Refreshes the Supabase session and enforces route-level access control.
 * Called from the root middleware.ts on every request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not run any code between createServerClient and getUser().
  // A subtle bug can make it hard to debug issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes that require authentication
  const requiresAuth =
    pathname.startsWith('/messages') ||
    pathname.startsWith('/profile') ||
    pathname === '/listings/new' ||
    pathname.match(/^\/listings\/[^/]+\/edit$/);

  if (!user && requiresAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    // Copy session cookies so a token refresh during this request isn't lost.
    return withSessionCookies(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  // Redirect logged-in users away from auth pages
  if (
    user &&
    (pathname.startsWith('/login') || pathname.startsWith('/register'))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/listings';
    redirectUrl.searchParams.delete('next');
    // Copy session cookies so refreshed tokens reach the browser.
    return withSessionCookies(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  return supabaseResponse;
}
