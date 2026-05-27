import { redirect } from 'next/navigation';
import { ListingForm } from '@/components/listings/ListingForm';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'List an item',
};

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/listings/new');

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">List a piece of furniture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only furniture — no electronics, clothing, or other categories.
          Listings expire after 90 days.
        </p>
      </div>

      <ListingForm mode="create" sellerId={user.id} />
    </div>
  );
}
