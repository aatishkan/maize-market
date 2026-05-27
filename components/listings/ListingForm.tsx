'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { dollarsToCents, getImageUrl } from '@/lib/utils';
import { CATEGORIES, LOGISTICS_TIERS, NEIGHBORHOODS, STORAGE_BUCKET } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploader, type PendingImage } from './ImageUploader';
import type { Listing, ListingImage } from '@/types/database';

// ── Zod schema ────────────────────────────────────────────────

const listingSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be under 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be under 2,000 characters'),
  price: z
    .string()
    .min(1, 'Price is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Enter a valid price'),
  category: z.enum(
    ['couch', 'desk', 'dresser', 'table', 'chair', 'bookshelf', 'bed_frame', 'other'] as const,
    { message: 'Select a category' }
  ),
  logistics_tier: z.enum(['self_carry', 'two_person', 'truck_required'] as const, {
    message: 'Select a logistics tier',
  }),
  neighborhood: z.string().min(1, 'Select a neighborhood'),
});

type ListingFormValues = z.infer<typeof listingSchema>;

// ── Props ─────────────────────────────────────────────────────

interface ListingFormProps {
  mode: 'create' | 'edit';
  sellerId: string;
  /** Pre-populated values for edit mode */
  defaultValues?: Partial<ListingFormValues>;
  listingId?: string;
  existingImages?: ListingImage[];
}

// ── Component ─────────────────────────────────────────────────

export function ListingForm({
  mode,
  sellerId,
  defaultValues,
  listingId: existingListingId,
  existingImages = [],
}: ListingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: defaultValues ?? {
      title: '',
      description: '',
      price: '',
      category: undefined,
      logistics_tier: undefined,
      neighborhood: '',
    },
  });

  const uploadImages = async (
    images: PendingImage[],
    listingId: string
  ): Promise<{ path: string; order: number }[]> => {
    const results: { path: string; order: number }[] = [];

    for (const img of images) {
      const ext = img.file.name.split('.').pop() ?? 'jpg';
      const path = `${sellerId}/${listingId}/${img.id}.${ext}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, img.file, {
          contentType: img.file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        toast.error(`Failed to upload ${img.file.name}. Check file size and try again.`);
        throw error;
      }

      results.push({ path, order: img.order });
    }

    return results;
  };

  const onSubmit = async (values: ListingFormValues) => {
    setSubmitting(true);

    try {
      const listingId = existingListingId ?? crypto.randomUUID();

      if (mode === 'create') {
        // 1. Upload images first
        const uploadedPaths = await uploadImages(pendingImages, listingId);

        // 2. Create the listing
        const { error: listingError } = await supabase.from('listings').insert({
          id: listingId,
          seller_id: sellerId,
          title: values.title.trim(),
          description: values.description.trim(),
          price_cents: dollarsToCents(values.price),
          category: values.category,
          logistics_tier: values.logistics_tier,
          neighborhood: values.neighborhood,
        });

        if (listingError) throw listingError;

        // 3. Insert image records
        if (uploadedPaths.length > 0) {
          const { error: imgError } = await supabase.from('listing_images').insert(
            uploadedPaths.map(({ path, order }) => ({
              listing_id: listingId,
              storage_path: path,
              display_order: order,
            }))
          );
          if (imgError) throw imgError;
        }

        toast.success('Listing published!');
        router.push(`/listings/${listingId}`);
      } else {
        // Edit mode
        const uploadedPaths = pendingImages.length > 0
          ? await uploadImages(pendingImages, listingId!)
          : [];

        const { error: updateError } = await supabase
          .from('listings')
          .update({
            title: values.title.trim(),
            description: values.description.trim(),
            price_cents: dollarsToCents(values.price),
            category: values.category,
            logistics_tier: values.logistics_tier,
            neighborhood: values.neighborhood,
          })
          .eq('id', listingId!);

        if (updateError) throw updateError;

        // Append new images
        if (uploadedPaths.length > 0) {
          const nextOrder = existingImages.length;
          await supabase.from('listing_images').insert(
            uploadedPaths.map(({ path, order }) => ({
              listing_id: listingId!,
              storage_path: path,
              display_order: nextOrder + order,
            }))
          );
        }

        toast.success('Listing updated!');
        router.push(`/listings/${listingId}`);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const descLen = watch('description')?.length ?? 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Photos */}
      <div className="space-y-1.5">
        <Label>
          Photos
          {mode === 'create' && <span className="text-muted-foreground font-normal ml-1">(optional but highly recommended)</span>}
        </Label>
        <ImageUploader value={pendingImages} onChange={setPendingImages} />
        {existingImages.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {existingImages.length} existing photo{existingImages.length !== 1 ? 's' : ''} · new uploads will be appended
          </p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. IKEA FRIHETEN Sleeper Sofa"
          {...register('title')}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="Describe condition, dimensions, age, reason for selling, etc."
          {...register('description')}
          aria-invalid={!!errors.description}
        />
        <div className="flex justify-between">
          {errors.description ? (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground">{descLen}/2000</p>
        </div>
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <Label htmlFor="price">Price ($)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            id="price"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            className="pl-7"
            {...register('price')}
            aria-invalid={!!errors.price}
          />
        </div>
        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        <p className="text-xs text-muted-foreground">Enter 0 for free.</p>
      </div>

      {/* Category + Logistics — 2 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            defaultValue={defaultValues?.category}
            onValueChange={(v) => setValue('category', v as ListingFormValues['category'])}
          >
            <SelectTrigger aria-invalid={!!errors.category}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Move logistics</Label>
          <Select
            defaultValue={defaultValues?.logistics_tier}
            onValueChange={(v) =>
              setValue('logistics_tier', v as ListingFormValues['logistics_tier'])
            }
          >
            <SelectTrigger aria-invalid={!!errors.logistics_tier}>
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              {LOGISTICS_TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex flex-col">
                    <span>
                      {t.icon} {t.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.logistics_tier && (
            <p className="text-xs text-destructive">{errors.logistics_tier.message}</p>
          )}
        </div>
      </div>

      {/* Neighborhood */}
      <div className="space-y-1.5">
        <Label>Pickup neighborhood</Label>
        <Select
          defaultValue={defaultValues?.neighborhood}
          onValueChange={(v) => v && setValue('neighborhood', v)}
        >
          <SelectTrigger aria-invalid={!!errors.neighborhood}>
            <SelectValue placeholder="Select neighborhood" />
          </SelectTrigger>
          <SelectContent>
            {NEIGHBORHOODS.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.neighborhood && (
          <p className="text-xs text-destructive">{errors.neighborhood.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Exact address is never shared — neighborhood only.
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-um-blue text-white hover:bg-um-blue-light h-11 text-base font-semibold"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {mode === 'create' ? 'Publishing…' : 'Saving…'}
          </>
        ) : mode === 'create' ? (
          'Publish listing'
        ) : (
          'Save changes'
        )}
      </Button>
    </form>
  );
}
