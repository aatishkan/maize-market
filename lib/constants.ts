import type { ListingCategory, LogisticsTier } from '@/types/database';

// ── Ann Arbor neighborhoods (predefined dropdown) ─────────────
export const NEIGHBORHOODS = [
  'Central Campus Area',
  'North Campus',
  'Hill / South State',
  'Burns Park',
  'Kerrytown',
  'Old West Side',
  'Downtown / Depot Town',
  'Ypsilanti',
  'Other',
] as const;

export type Neighborhood = (typeof NEIGHBORHOODS)[number];

// ── Listing categories ────────────────────────────────────────
export const CATEGORIES: { value: ListingCategory; label: string; emoji: string }[] = [
  { value: 'couch',     label: 'Couch / Sofa', emoji: '🛋️' },
  { value: 'desk',      label: 'Desk',         emoji: '🖥️' },
  { value: 'dresser',   label: 'Dresser',       emoji: '🗄️' },
  { value: 'table',     label: 'Table',         emoji: '🪑' },
  { value: 'chair',     label: 'Chair',         emoji: '💺' },
  { value: 'bookshelf', label: 'Bookshelf',     emoji: '📚' },
  { value: 'bed_frame', label: 'Bed Frame',     emoji: '🛏️' },
  { value: 'other',     label: 'Other',         emoji: '📦' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
) as Record<ListingCategory, (typeof CATEGORIES)[number]>;

// ── Logistics tiers ───────────────────────────────────────────
export const LOGISTICS_TIERS: {
  value: LogisticsTier;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'self_carry',
    label: 'Self-carry',
    description: 'One person, fits in a car',
    icon: '🚗',
  },
  {
    value: 'two_person',
    label: 'Two-person',
    description: 'Needs a second person or SUV',
    icon: '🚐',
  },
  {
    value: 'truck_required',
    label: 'Truck required',
    description: 'Large or heavy — needs a truck',
    icon: '🚛',
  },
];

export const LOGISTICS_MAP = Object.fromEntries(
  LOGISTICS_TIERS.map((t) => [t.value, t])
) as Record<LogisticsTier, (typeof LOGISTICS_TIERS)[number]>;

// ── Listing constraints ────────────────────────────────────────
export const MAX_IMAGES_PER_LISTING = 6;
export const MAX_IMAGE_SIZE_BYTES   = 10 * 1024 * 1024; // 10 MB
export const LISTING_EXPIRY_DAYS    = 90;

// ── Brand colors (for use in non-Tailwind contexts) ───────────
export const COLORS = {
  maize:   '#FFCB05',
  umBlue:  '#00274C',
} as const;

// ── Storage ───────────────────────────────────────────────────
export const STORAGE_BUCKET = 'listing-images';
