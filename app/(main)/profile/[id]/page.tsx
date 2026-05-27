import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from '@/components/profile/ProfileClient';
import type { Profile, ListingWithImages } from '@/types/database';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', id)
    .single();
  const row = data as unknown as { display_name: string } | null;
  return { title: row ? `${row.display_name}'s listings` : 'Profile' };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect owner to /profile (canonical URL)
  if (user?.id === id) redirect('/profile');

  const [profileResult, listingsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase
      .from('listings')
      .select('*, listing_images(id, storage_path, display_order)')
      .eq('seller_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);

  if (!profileResult.data) notFound();

  const profile = profileResult.data as unknown as Profile;
  const listings = (listingsResult.data ?? []) as unknown as ListingWithImages[];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <ProfileClient profile={profile} listings={listings} isOwner={false} />
    </div>
  );
}
