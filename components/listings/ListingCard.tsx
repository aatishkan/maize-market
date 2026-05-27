import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice, formatRelativeDate, getPrimaryImageUrl } from '@/lib/utils';
import { CATEGORY_MAP, LOGISTICS_MAP } from '@/lib/constants';
import type { ListingWithImages } from '@/types/database';

interface ListingCardProps {
  listing: ListingWithImages;
  className?: string;
}

const logisticsBadgeColors = {
  self_carry:     'bg-green-100 text-green-800',
  two_person:     'bg-blue-100 text-blue-800',
  truck_required: 'bg-orange-100 text-orange-800',
};

export function ListingCard({ listing, className }: ListingCardProps) {
  const imageUrl = getPrimaryImageUrl(listing.listing_images);
  const category = CATEGORY_MAP[listing.category];
  const logistics = LOGISTICS_MAP[listing.logistics_tier];
  const isSold = listing.status === 'sold';

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        'group block rounded-xl overflow-hidden border border-border bg-card shadow-sm',
        'hover:shadow-md hover:border-um-blue/30 transition-all duration-200',
        isSold && 'opacity-75',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-furniture.svg';
          }}
        />

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="bg-white text-foreground font-bold text-sm px-3 py-1 rounded-full shadow">
              SOLD
            </span>
          </div>
        )}

        {/* Category badge — top left */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            <span>{category.emoji}</span>
            <span>{category.label}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">
            {listing.title}
          </p>
          <p className="text-base font-bold text-um-blue shrink-0">
            {formatPrice(listing.price_cents)}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Logistics tier */}
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              logisticsBadgeColors[listing.logistics_tier]
            )}
          >
            <span>{logistics.icon}</span>
            <span>{logistics.label}</span>
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{listing.neighborhood}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-1">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(listing.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
