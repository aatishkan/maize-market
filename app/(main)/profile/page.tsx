import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from '@/components/profile/ProfileClient';
import type { Profile, ListingWithImages } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/profile');

  const [profileResult, listingsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('listings')
      .select('*, listing_images(id, storage_path, display_order)')
      .eq('seller_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false }),
  ]);

  const profile = profileResult.data as unknown as Profile;
  const listings = (listingsResult.data ?? []) as unknown as ListingWithImages[];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <ProfileClient profile={profile} listings={listings} isOwner />
    </div>
  );
}
