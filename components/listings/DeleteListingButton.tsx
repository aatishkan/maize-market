'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteListingButtonProps {
  listingId: string;
}

export function DeleteListingButton({ listingId }: DeleteListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Soft-delete: set status = 'deleted'. The listings SELECT RLS policy
      // (amendment #8) filters out deleted rows, so this listing becomes
      // invisible to all queries without removing the underlying data.
      const { error } = await supabase
        .from('listings')
        .update({ status: 'deleted' })
        .eq('id', listingId);

      if (error) {
        console.error('[DeleteListingButton] error:', error);
        toast.error('Failed to delete listing. Try again.');
        setLoading(false);
      } else {
        toast.success('Listing deleted.');
        router.push('/listings');
        // Don't setLoading(false) — keep button disabled while navigating away.
      }
    } catch (err) {
      console.error('[DeleteListingButton] unexpected error:', err);
      toast.error('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete listing
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              The listing will be removed and won&apos;t appear in search results.
              Existing conversations will still be accessible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Yes, delete listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
