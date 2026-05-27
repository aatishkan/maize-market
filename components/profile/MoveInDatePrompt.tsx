'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MoveInDatePromptProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function MoveInDatePrompt({ open, onClose, userId }: MoveInDatePromptProps) {
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ move_in_date: date })
      .eq('id', userId);

    if (error) {
      toast.error('Could not save move-in date. Try again.');
    } else {
      toast.success('Move-in date saved!');
      router.refresh();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-um-blue-muted">
              <Calendar className="h-5 w-5 text-um-blue" />
            </div>
            <DialogTitle>When are you moving in?</DialogTitle>
          </div>
          <DialogDescription>
            Set your move-in date and we'll surface the best furniture listings at exactly
            the right time — before the August rush claims everything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="move-in-date">Move-in date</Label>
            <Input
              id="move-in-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ann Arbor leases typically start August 1st. You can change this anytime in your profile.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Skip for now
          </Button>
          <Button
            onClick={handleSave}
            disabled={!date || saving}
            className="bg-um-blue text-white hover:bg-um-blue-light"
          >
            {saving ? 'Saving…' : 'Save date'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
