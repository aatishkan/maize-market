import Link from 'next/link';
import { ListingCard } from './ListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { ListingWithImages } from '@/types/database';

interface ListingGridProps {
  listings: ListingWithImages[];
  emptyHeadline?: string;
  emptySubtext?: string;
}

export function ListingGrid({
  listings,
  emptyHeadline = 'No listings yet',
  emptySubtext = 'Check back soon — new furniture gets listed every day.',
}: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <EmptyState
        icon={Package}
        headline={emptyHeadline}
        subtext={emptySubtext}
        action={
          <Link
            href="/listings/new"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-um-blue text-white hover:bg-um-blue-light')}
          >
            List something
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
