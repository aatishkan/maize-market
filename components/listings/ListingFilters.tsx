'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CATEGORIES, LOGISTICS_TIERS } from '@/lib/constants';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

interface ListingFiltersProps {
  className?: string;
}

export function ListingFilters({ className }: ListingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Always reset to page 1 when filters change
      params.delete('page');
      return params.toString();
    },
    [searchParams]
  );

  const update = (updates: Record<string, string | null>) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString(updates)}`);
    });
  };

  const q        = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const tier     = searchParams.get('tier') ?? '';
  const minPrice = searchParams.get('min_price') ?? '';
  const maxPrice = searchParams.get('max_price') ?? '';
  const sort     = searchParams.get('sort') ?? 'newest';
  const status   = searchParams.get('status') ?? 'active';

  const hasActiveFilters =
    !!category || !!tier || !!minPrice || !!maxPrice || sort !== 'newest' || status !== 'active';

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname + (q ? `?q=${encodeURIComponent(q)}` : ''));
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      <div>
        <Input
          placeholder="Search listings…"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              update({ q: (e.target as HTMLInputElement).value || null });
            }
          }}
          onBlur={(e) => {
            if (e.target.value !== q) {
              update({ q: e.target.value || null });
            }
          }}
          className="bg-white"
        />
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
        {/* Category */}
        <div className="sm:min-w-[150px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
          <Select
            value={category || 'all'}
            onValueChange={(v) => update({ category: v === 'all' ? null : v })}
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logistics tier */}
        <div className="sm:min-w-[150px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Move logistics</Label>
          <Select
            value={tier || 'all'}
            onValueChange={(v) => update({ tier: v === 'all' ? null : v })}
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue placeholder="Any logistics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any logistics</SelectItem>
              {LOGISTICS_TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price range — spans both columns on mobile */}
        <div className="col-span-2 flex items-end gap-1.5">
          <div className="flex-1 sm:flex-none">
            <Label className="text-xs text-muted-foreground mb-1 block">Min $</Label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              defaultValue={minPrice}
              className="w-full sm:w-20 h-9 bg-white"
              onBlur={(e) => update({ min_price: e.target.value || null })}
            />
          </div>
          <span className="text-muted-foreground pb-2">–</span>
          <div className="flex-1 sm:flex-none">
            <Label className="text-xs text-muted-foreground mb-1 block">Max $</Label>
            <Input
              type="number"
              placeholder="∞"
              min={0}
              defaultValue={maxPrice}
              className="w-full sm:w-20 h-9 bg-white"
              onBlur={(e) => update({ max_price: e.target.value || null })}
            />
          </div>
        </div>

        {/* Status toggle */}
        <div className="sm:min-w-[120px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => update({ status: v })}
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Available</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="sm:min-w-[160px] sm:ml-auto">
          <Label className="text-xs text-muted-foreground mb-1 block">Sort by</Label>
          <Select
            value={sort}
            onValueChange={(v) => update({ sort: v })}
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="col-span-2 w-full sm:w-auto h-9 text-muted-foreground gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {isPending && (
        <p className="text-xs text-muted-foreground animate-pulse">Updating results…</p>
      )}
    </div>
  );
}
