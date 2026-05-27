'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MAX_IMAGES_PER_LISTING, MAX_IMAGE_SIZE_BYTES } from '@/lib/constants';

export interface PendingImage {
  /** Stable ID for this slot */
  id: string;
  /** Local object URL for preview */
  previewUrl: string;
  /** The actual File to upload on form submit */
  file: File;
  /** display_order index */
  order: number;
}

interface ImageUploaderProps {
  value: PendingImage[];
  onChange: (images: PendingImage[]) => void;
  className?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export function ImageUploader({ value, onChange, className }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = MAX_IMAGES_PER_LISTING - value.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_IMAGES_PER_LISTING} photos per listing.`);
        return;
      }

      const toAdd: PendingImage[] = [];
      for (const file of fileArray.slice(0, remaining)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: unsupported format. Use JPG, PNG, or WebP.`);
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(`${file.name}: file too large (max 10 MB).`);
          continue;
        }
        toAdd.push({
          id: crypto.randomUUID(),
          previewUrl: URL.createObjectURL(file),
          file,
          order: value.length + toAdd.length,
        });
      }

      if (toAdd.length > 0) {
        onChange([...value, ...toAdd]);
      }
    },
    [value, onChange]
  );

  const removeImage = (id: string) => {
    const next = value
      .filter((img) => img.id !== id)
      .map((img, i) => ({ ...img, order: i }));
    onChange(next);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const next = [...value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next.map((img, i) => ({ ...img, order: i })));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      {value.length < MAX_IMAGES_PER_LISTING && (
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed',
            'cursor-pointer transition-colors py-8 px-4 text-center',
            dragging
              ? 'border-um-blue bg-um-blue-muted'
              : 'border-border hover:border-um-blue/50 hover:bg-muted/50'
          )}
        >
          <Upload className={cn('h-6 w-6', dragging ? 'text-um-blue' : 'text-muted-foreground')} />
          <div>
            <p className="text-sm font-medium">
              {dragging ? 'Drop photos here' : 'Upload photos'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop or click · JPG, PNG, WebP · max 10 MB each ·{' '}
              {MAX_IMAGES_PER_LISTING - value.length} slot
              {MAX_IMAGES_PER_LISTING - value.length !== 1 ? 's' : ''} left
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((img, index) => (
            <div
              key={img.id}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden border border-border',
                index === 0 && 'ring-2 ring-um-blue ring-offset-1'
              )}
            >
              <Image
                src={img.previewUrl}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover"
                sizes="33vw"
              />
              {/* Primary indicator */}
              {index === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-um-blue/80 text-white text-[10px] font-semibold text-center py-0.5">
                  Cover
                </div>
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
              {/* Move left/right arrows */}
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => moveImage(index, index - 1)}
                  className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-[10px] font-bold"
                  aria-label="Move left"
                >
                  ←
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          The first photo will be the cover image shown in listings.
        </p>
      )}
    </div>
  );
}
