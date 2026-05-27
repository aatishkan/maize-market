'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
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

interface MarkSoldButtonProps {
  listingId: string;
}

export function MarkSoldButton({ listingId }: MarkSoldButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleMarkSold = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listingId);

    if (error) {
      toast.error('Failed to mark as sold. Try again.');
    } else {
      toast.success('Listing marked as sold!');
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-green-700 text-white hover:bg-green-800 gap-2"
      >
        <CheckCircle2 className="h-4 w-4" />
        Mark as sold
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark this item as sold?</DialogTitle>
            <DialogDescription>
              The listing will be marked sold and no longer appear in active searches.
              Existing conversations will still be accessible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkSold}
              disabled={loading}
              className="bg-green-700 text-white hover:bg-green-800"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, mark sold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
