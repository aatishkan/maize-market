import { Suspense } from 'react';
import { ListingFilters } from '@/components/listings/ListingFilters';
import { ListingGrid, ListingGridSkeleton } from '@/components/listings/ListingGrid';
import { createClient } from '@/lib/supabase/server';
import type { ListingWithImages, ListingCategory, LogisticsTier } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Browse Furniture' };

interface SearchParams {
  q?: string;
  category?: string;
  tier?: string;
  min_price?: string;
  max_price?: string;
  sort?: string;
  status?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 24;

async function ListingsResults({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();

  const {
    q,
    category,
    tier,
    min_price,
    max_price,
    sort = 'newest',
    status = 'active',
    page = '1',
  } = searchParams;

  const currentPage = Math.max(1, parseInt(page));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Build query — all chained calls return the same builder type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('listings')
    .select('*, listing_images(id, storage_path, display_order)');

  if (status === 'active') {
    query = query.eq('status', 'active').gt('expires_at', new Date().toISOString());
  } else if (status === 'sold') {
    query = query.eq('status', 'sold');
  }

  if (q) {
    query = query.textSearch('search_vector', q, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (category) query = query.eq('category', category as ListingCategory);
  if (tier)     query = query.eq('logistics_tier', tier as LogisticsTier);

  if (min_price) query = query.gte('price_cents', Math.round(parseFloat(min_price) * 100));
  if (max_price) query = query.lte('price_cents', Math.round(parseFloat(max_price) * 100));

  if (sort === 'price_asc')  query = query.order('price_cents', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price_cents', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Something went wrong loading listings. Please try again.
      </div>
    );
  }

  const listings = (data ?? []) as ListingWithImages[];
  const hasQuery = !!(q || category || tier || min_price || max_price);

  return (
    <ListingGrid
      listings={listings}
      emptyHeadline={hasQuery ? 'No listings match your filters' : 'No listings yet'}
      emptySubtext={
        hasQuery
          ? 'Try adjusting your search or clearing filters.'
          : 'Be the first to list something!'
      }
    />
  );
}

export default async function ListingsPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Browse furniture</h1>
      <ListingFilters />
      <Suspense fallback={<ListingGridSkeleton count={PAGE_SIZE} />}>
        <ListingsResults searchParams={params} />
      </Suspense>
    </div>
  );
}
