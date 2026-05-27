import Link from 'next/link';
import Image from 'next/image';
import { cn, formatRelativeDate, formatPrice, getPrimaryImageUrl } from '@/lib/utils';
import type { ConversationWithDetails } from '@/types/database';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  currentUserId: string;
  activeConversationId?: string;
}

export function ConversationList({
  conversations,
  currentUserId,
  activeConversationId,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No conversations yet.
        <br />
        Message a seller from any listing.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((convo) => {
        const isActive = convo.id === activeConversationId;
        const other =
          currentUserId === convo.buyer_id ? convo.seller : convo.buyer;
        const thumbUrl = getPrimaryImageUrl(
          convo.listings.listing_images.map((img, i) => ({
            ...img,
            display_order: i,
          }))
        );
        const isSold = convo.listings.status === 'sold';

        return (
          <li key={convo.id}>
            <Link
              href={`/messages/${convo.id}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors',
                isActive && 'bg-um-blue-muted border-l-2 border-um-blue'
              )}
            >
              {/* Listing thumbnail */}
              <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
                <Image
                  src={thumbUrl}
                  alt={convo.listings.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
                {isSold && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">SOLD</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {convo.listings.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {other.display_name} · {formatPrice(convo.listings.price_cents)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeDate(convo.last_message_at)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
