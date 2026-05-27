import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MessageThread } from '@/components/messages/MessageThread';
import { ConversationList } from '@/components/messages/ConversationList';
import { formatPrice, getPrimaryImageUrl } from '@/lib/utils';
import type { ConversationWithDetails, Message } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conversation' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/messages/${id}`);

  const [conversationResult, allConversationsResult, messagesResult] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        *,
        listings!inner(id, title, price_cents, status,
          listing_images(storage_path, display_order)
        ),
        buyer:profiles!buyer_id(id, display_name),
        seller:profiles!seller_id(id, display_name)
      `)
      .eq('id', id)
      .single(),

    supabase
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
      .order('last_message_at', { ascending: false }),

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const conversation = conversationResult.data as unknown as ConversationWithDetails | null;
  if (!conversation) notFound();

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    redirect('/messages');
  }

  const allConversations = (allConversationsResult.data ?? []) as unknown as ConversationWithDetails[];
  const messages = (messagesResult.data ?? []) as unknown as Message[];

  const other =
    user.id === conversation.buyer_id ? conversation.seller : conversation.buyer;
  const listingThumb = getPrimaryImageUrl(
    conversation.listings.listing_images.map((img, i) => ({
      ...img,
      display_order: i,
    }))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 sm:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        All messages
      </Link>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Sidebar (desktop only) */}
        <div className="hidden sm:flex sm:w-72 flex-col border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={allConversations}
              currentUserId={user.id}
              activeConversationId={id}
            />
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden shadow-sm min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <Link
              href={`/listings/${conversation.listing_id}`}
              className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity"
            >
              <Image
                src={listingThumb}
                alt={conversation.listings.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/listings/${conversation.listing_id}`}
                className="text-sm font-semibold hover:text-um-blue transition-colors truncate block"
              >
                {conversation.listings.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatPrice(conversation.listings.price_cents)} · with {other.display_name}
              </p>
            </div>
          </div>

          <MessageThread
            conversationId={id}
            currentUserId={user.id}
            initialMessages={messages}
          />
        </div>
      </div>
    </div>
  );
}
