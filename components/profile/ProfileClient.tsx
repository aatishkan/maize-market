'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Pencil, Package } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { formatDate, getInitials } from '@/lib/utils';
import type { Profile, ListingWithImages, ListingStatus } from '@/types/database';

const profileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be under 50 characters'),
  move_in_date: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileClientProps {
  profile: Profile;
  listings: ListingWithImages[];
  isOwner: boolean;
}

export function ProfileClient({ profile, listings, isOwner }: ProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name,
      move_in_date: profile.move_in_date ?? '',
    },
  });

  const onSave = async (values: ProfileFormValues) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: values.display_name.trim(),
        move_in_date: values.move_in_date || null,
      })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to save changes. Try again.');
    } else {
      toast.success('Profile updated!');
      setEditing(false);
      router.refresh();
    }
  };

  const activeListings = listings.filter((l) => l.status === 'active');
  const soldListings   = listings.filter((l) => l.status === 'sold');

  return (
    <div className="space-y-8">
      {/* Profile card */}
      <div className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm">
        <Avatar className="h-20 w-20 border-2 border-um-blue/20 shrink-0">
          <AvatarFallback className="bg-um-blue-muted text-um-blue text-2xl font-bold">
            {getInitials(profile.display_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-3">
          {editing ? (
            <form onSubmit={handleSubmit(onSave)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  {...register('display_name')}
                  aria-invalid={!!errors.display_name}
                />
                {errors.display_name && (
                  <p className="text-xs text-destructive">{errors.display_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="move_in_date" className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Move-in date
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="move_in_date"
                  type="date"
                  {...register('move_in_date')}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  We'll nudge you at the right time to find good furniture before the rush.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting} size="sm"
                  className="bg-um-blue text-white hover:bg-um-blue-light">
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{profile.display_name}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>Member since {formatDate(profile.created_at)}</span>
                {profile.move_in_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Moving in {formatDate(profile.move_in_date)}
                  </span>
                )}
              </div>

              <div className="flex gap-3 text-sm">
                <span>
                  <strong>{activeListings.length}</strong>{' '}
                  <span className="text-muted-foreground">active</span>
                </span>
                <span>
                  <strong>{soldListings.length}</strong>{' '}
                  <span className="text-muted-foreground">sold</span>
                </span>
              </div>

              {isOwner && !profile.move_in_date && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-um-blue hover:underline"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Set your move-in date
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Listings tabs */}
      {isOwner ? (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Active <Badge variant="secondary" className="ml-1.5">{activeListings.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sold">
              Sold <Badge variant="secondary" className="ml-1.5">{soldListings.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
            <ListingGrid
              listings={activeListings}
              emptyHeadline="You have no active listings"
              emptySubtext="List a piece of furniture for your fellow Wolverines."
            />
          </TabsContent>
          <TabsContent value="sold" className="mt-6">
            <ListingGrid
              listings={soldListings}
              emptyHeadline="No sold listings yet"
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Listings by {profile.display_name}
          </h2>
          <ListingGrid
            listings={activeListings}
            emptyHeadline="No active listings"
            emptySubtext={`${profile.display_name} hasn't listed anything yet.`}
          />
        </div>
      )}
    </div>
  );
}
