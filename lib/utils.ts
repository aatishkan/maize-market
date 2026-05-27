import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui utility — kept as-is
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Price helpers ─────────────────────────────────────────────

/** Converts integer cents to a display string: 4500 → "$45" */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

/** Converts a dollar string from a form input to integer cents: "45.50" → 4550 */
export function dollarsToCents(dollars: string): number {
  const val = parseFloat(dollars.replace(/[^0-9.]/g, ''));
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

// ── Date helpers ──────────────────────────────────────────────

/** "3 days ago", "Yesterday", "Today", "2w ago" */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/** "Aug 1, 2025" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Supabase Storage helpers ──────────────────────────────────

/**
 * Builds the full public URL for an image in the listing-images bucket.
 */
export function getImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/object/public/listing-images/${storagePath}`;
}

/**
 * Returns the first image URL from a list of listing images, or a placeholder.
 */
export function getPrimaryImageUrl(
  images: { storage_path: string; display_order: number }[]
): string {
  if (!images || images.length === 0) return '/placeholder-furniture.svg';
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
  return getImageUrl(sorted[0].storage_path);
}

// ── Misc ──────────────────────────────────────────────────────

/** Truncates text to maxLen characters with ellipsis */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/** Returns initials from a display name: "John Doe" → "JD" */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
