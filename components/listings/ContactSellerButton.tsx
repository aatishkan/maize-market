'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface ContactSellerButtonProps {
  listingId: string;
  sellerId: string;
  currentUserId: string;
}

export function ContactSellerButton({
  listingId,
  sellerId,
  currentUserId,
}: ContactSellerButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleContact = async () => {
    setLoading(true);

    // Check if a conversation already exists for this listing + buyer pair
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', currentUserId)
      .maybeSingle();

    if (existing) {
      router.push(`/messages/${existing.id}`);
      return;
    }

    // Create a new conversation
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: currentUserId,
        seller_id: sellerId,
      })
      .select('id')
      .single();

    if (error || !created) {
      toast.error('Could not start conversation. Try again.');
      setLoading(false);
      return;
    }

    router.push(`/messages/${created.id}`);
  };

  return (
    <Button
      onClick={handleContact}
      disabled={loading}
      className="w-full bg-um-blue text-white hover:bg-um-blue-light gap-2 h-11 text-base"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <MessageSquare className="h-5 w-5" />
          Message seller
        </>
      )}
    </Button>
  );
}
