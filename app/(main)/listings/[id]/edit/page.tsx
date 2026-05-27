import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingForm } from '@/components/listings/ListingForm';
import type { ListingWithImages } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Edit listing' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/listings/${id}/edit`);

  const { data } = await supabase
    .from('listings')
    .select('*, listing_images(id, storage_path, display_order)')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const listing = data as unknown as ListingWithImages;

  // Only the seller can edit
  if (listing.seller_id !== user.id) redirect(`/listings/${id}`);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href={`/listings/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listing
      </Link>

      <h1 className="text-2xl font-bold mb-8">Edit listing</h1>

      <ListingForm
        mode="edit"
        sellerId={user.id}
        listingId={listing.id}
        defaultValues={{
          title: listing.title,
          description: listing.description,
          price: (listing.price_cents / 100).toString(),
          category: listing.category,
          logistics_tier: listing.logistics_tier,
          neighborhood: listing.neighborhood,
        }}
        existingImages={listing.listing_images}
      />
    </div>
  );
}
