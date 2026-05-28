'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, Plus, User, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Profile } from '@/types/database';

interface NavbarProps {
  /** Server-provided initial profile — used for SSR and as the starting state. */
  profile: Profile | null;
  unreadCount?: number;
}

export function Navbar({ profile: serverProfile, unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The Navbar owns its own auth state so it stays correct regardless of
  // whether the server-side layout had a stale/cached getUser() result.
  // Initialise from the server prop to avoid a flash on the first render.
  const [profile, setProfile] = useState<Profile | null>(serverProfile);

  // Stable client reference — never re-created across renders.
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION (the current
    // browser session), then again on every sign-in / sign-out / token refresh.
    // This is the single source of truth for the Navbar's auth state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setProfile(null);
          return;
        }

        // Fetch (or re-fetch) the profile whenever the session changes.
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setProfile(data as Profile | null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await supabase.auth.signOut();
    // onAuthStateChange will set profile → null automatically.
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-um-blue shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-0.5 shrink-0">
            <span className="text-maize font-bold text-xl tracking-tight">Maize</span>
            <span className="text-white font-bold text-xl tracking-tight">Market</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/listings"
              className={cn(
                'text-sm font-medium transition-colors',
                pathname.startsWith('/listings')
                  ? 'text-maize'
                  : 'text-white/80 hover:text-white'
              )}
            >
              Browse
            </Link>
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {profile ? (
              <>
                {/* Sell button */}
                <Link
                  href="/listings/new"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'bg-maize text-um-blue hover:bg-maize-dark font-semibold'
                  )}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  List item
                </Link>

                {/* Messages */}
                <Link
                  href="/messages"
                  className="relative text-white/80 hover:text-white transition-colors"
                  aria-label="Messages"
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-maize text-[10px] font-bold text-um-blue">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-maize focus:ring-offset-2 focus:ring-offset-um-blue">
                    <Avatar className="h-8 w-8 border-2 border-white/20">
                      <AvatarFallback className="bg-um-blue-light text-white text-xs font-semibold">
                        {getInitials(profile.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{profile.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      My profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'bg-maize text-um-blue hover:bg-maize-dark font-semibold'
                  )}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-um-blue border-t border-white/10 px-4 pb-4 pt-2 space-y-1">
          <Link
            href="/listings"
            className="block px-3 py-2 text-white/80 hover:text-white text-sm font-medium rounded-md hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            Browse
          </Link>
          {profile ? (
            <>
              <Link
                href="/listings/new"
                className="block px-3 py-2 text-maize text-sm font-semibold rounded-md hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                + List item
              </Link>
              <Link
                href="/messages"
                className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                Messages
                {unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-maize text-[10px] font-bold text-um-blue">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className="block px-3 py-2 text-white/80 hover:text-white text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                My profile
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 text-red-400 text-sm font-medium rounded-md hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block px-3 py-2 text-white/80 hover:text-white text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="block px-3 py-2 text-maize text-sm font-semibold rounded-md hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
