import Link from 'next/link';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { createClient } from '@/lib/supabase/server';
import type { ListingWithImages } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MaizeMarket — UMich Student Furniture',
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('listings')
    .select('*, listing_images(id, storage_path, display_order)')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(8);

  const recentListings = (data ?? []) as unknown as ListingWithImages[];

  return (
    <div>
      {/* Hero */}
      <section className="bg-um-blue text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Furniture for{' '}
              <span className="text-maize">Michigan students</span>.
              <br />
              By Michigan students.
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-xl">
              Buy and sell used furniture in Ann Arbor — only verified @umich.edu
              accounts. No scams, no strangers, no Craigslist anxiety.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/listings"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'bg-maize text-um-blue hover:bg-maize-dark font-semibold text-base h-12 px-6'
                )}
              >
                Browse furniture
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href={user ? '/listings/new' : '/register'}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'border-white/30 text-white hover:bg-white/10 h-12 px-6'
                )}
              >
                {user ? 'List an item' : 'Sign up free'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Verified UMich only',
                body: 'Every account requires a confirmed @umich.edu email.',
              },
              {
                icon: Zap,
                title: 'Local pickup only',
                body: 'Everything is in Ann Arbor. No shipping, no hassle.',
              },
              {
                icon: Users,
                title: 'Pay in person',
                body: 'Cash or Venmo — no platform fees, ever.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-um-blue-muted">
                  <Icon className="h-5 w-5 text-um-blue" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent listings */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Recent listings</h2>
          <Link
            href="/listings"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'text-um-blue hover:text-um-blue'
            )}
          >
            See all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <ListingGrid
          listings={recentListings}
          emptyHeadline="No listings yet"
          emptySubtext="Be the first to list furniture for your fellow Wolverines."
        />
      </section>

      {/* Seasonal CTA */}
      <section className="bg-um-blue-muted border-t border-um-blue/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-um-blue">
            Ann Arbor leases flip August 1st.
          </h2>
          <p className="mt-2 text-sm text-um-blue/80 max-w-xl mx-auto">
            Move-out season peaks in April and May — that's when the best couches, desks,
            and dressers get listed. Don't wait until August when everything's gone.
          </p>
          <div className="mt-5">
            <Link
              href={user ? '/listings' : '/register'}
              className={cn(buttonVariants(), 'bg-um-blue text-white hover:bg-um-blue-light')}
            >
              {user ? 'Browse now →' : 'Create account →'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
