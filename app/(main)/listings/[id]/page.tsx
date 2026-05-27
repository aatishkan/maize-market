import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, ArrowLeft, MessageSquare, CheckCircle2, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { MarkSoldButton } from '@/components/listings/MarkSoldButton';
import { ContactSellerButton } from '@/components/listings/ContactSellerButton';
import { CATEGORY_MAP, LOGISTICS_MAP } from '@/lib/constants';
import { formatPrice, formatDate, getImageUrl, getInitials } from '@/lib/utils';
import type { ListingWithSeller } from '@/types/database';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('listings')
    .select('title, description, price_cents')
    .eq('id', id)
    .single();

  if (!data) return { title: 'Listing not found' };
  const row = data as unknown as { title: string; description: string; price_cents: number };
  return {
    title: `${row.title} — ${formatPrice(row.price_cents)}`,
    description: row.description.slice(0, 160),
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images(id, storage_path, display_order),
      profiles!seller_id(id, display_name, email, created_at)
    `)
    .eq('id', id)
    .single();

  if (!data) notFound();

  const typedListing = data as unknown as ListingWithSeller;
  const seller = typedListing.profiles;
  const images = [...typedListing.listing_images].sort(
    (a, b) => a.display_order - b.display_order
  );
  const primaryImage = images[0];
  const isSold = typedListing.status === 'sold';
  const isOwner = user?.id === typedListing.seller_id;
  const category = CATEGORY_MAP[typedListing.category];
  const logistics = LOGISTICS_MAP[typedListing.logistics_tier];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/listings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Images — 3/5 on desktop */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border">
            {primaryImage ? (
              <Image
                src={getImageUrl(primaryImage.storage_path)}
                alt={typedListing.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <span className="text-4xl">{category.emoji}</span>
              </div>
            )}
            {isSold && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                <span className="bg-white text-foreground font-bold text-xl px-5 py-2 rounded-full shadow-lg">
                  SOLD
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.slice(1).map((img) => (
                <div
                  key={img.id}
                  className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden border border-border"
                >
                  <Image
                    src={getImageUrl(img.storage_path)}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details — 2/5 on desktop */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-snug">
              {typedListing.title}
            </h1>
            <p className="text-3xl font-bold text-um-blue mt-2">
              {formatPrice(typedListing.price_cents)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <span>{category.emoji}</span>
              {category.label}
            </Badge>
            <Badge
              variant="outline"
              className={
                typedListing.logistics_tier === 'self_carry'
                  ? 'border-green-300 text-green-800'
                  : typedListing.logistics_tier === 'two_person'
                  ? 'border-blue-300 text-blue-800'
                  : 'border-orange-300 text-orange-800'
              }
            >
              {logistics.icon} {logistics.label}
            </Badge>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{typedListing.neighborhood}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Listed {formatDate(typedListing.created_at)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarFallback className="bg-um-blue-muted text-um-blue font-semibold text-sm">
                {getInitials(seller.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{seller.display_name}</p>
              <p className="text-xs text-muted-foreground">
                Member since {formatDate(seller.created_at)}
              </p>
            </div>
          </div>

          <Separator />

          {isOwner ? (
            <div className="space-y-2">
              {!isSold && <MarkSoldButton listingId={typedListing.id} />}
              <Link
                href={`/listings/${typedListing.id}/edit`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
              >
                <Pencil className="h-4 w-4" />
                Edit listing
              </Link>
            </div>
          ) : user && !isSold ? (
            <ContactSellerButton
              listingId={typedListing.id}
              sellerId={typedListing.seller_id}
              currentUserId={user.id}
            />
          ) : !user ? (
            <Link
              href={`/login?next=/listings/${typedListing.id}`}
              className={cn(
                buttonVariants(),
                'w-full bg-um-blue text-white hover:bg-um-blue-light gap-2'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Log in to message seller
            </Link>
          ) : isSold ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              This item has been sold
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 max-w-2xl">
        <h2 className="text-lg font-semibold mb-3">Description</h2>
        <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
          {typedListing.description}
        </p>
      </div>

      <div className="mt-8 rounded-xl bg-muted/50 border border-border px-5 py-4 max-w-2xl">
        <p className="text-xs font-semibold text-foreground mb-1">Safety reminder</p>
        <p className="text-xs text-muted-foreground">
          Meet in a public place on campus. Bring a friend for large items.
          Pay with Venmo or cash — never wire transfers or gift cards.
        </p>
      </div>
    </div>
  );
}
