import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ConversationList } from '@/components/messages/ConversationList';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { ConversationWithDetails } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/messages');

  const { data } = await supabase
    .from('conversations')
    .select(`
      *,
      listings!inner(id, title, price_cents, status,
        listing_images(storage_path, display_order)
      ),
      buyer:profiles!buyer_id(id, display_name),
      seller:profiles!seller_id(id, display_name)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  const typedConversations = (data ?? []) as unknown as ConversationWithDetails[];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {typedConversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          headline="No conversations yet"
          subtext="Browse listings and message a seller to get started."
          action={
            <Link
              href="/listings"
              className={cn(buttonVariants({ size: 'sm' }), 'bg-um-blue text-white hover:bg-um-blue-light')}
            >
              Browse listings
            </Link>
          }
        />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm">
          <ConversationList
            conversations={typedConversations}
            currentUserId={user.id}
          />
        </div>
      )}
    </div>
  );
}
