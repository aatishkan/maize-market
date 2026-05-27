@AGENTS.md

# MaizeMarket — Project Context

**Read this file in full before writing any code.** It covers the full tech stack
(with version-specific breaking changes), every schema decision, the planned build
order, current completion state, and known outstanding items.

---

## What Is MaizeMarket

A UMich-only student furniture marketplace. Only verified `@umich.edu` email
holders can create an account. Single vertical: furniture. No payments, no movers
tab, no rentals, no other categories in the MVP.

**Core product insight:** Ann Arbor leases flip Aug 1. Supply peaks April–May
(students moving out). Demand peaks August (students moving in). The app nudges
users to browse early rather than scramble at the last minute.

**Design:** UMich maize (#FFCB05) and blue (#00274C) as accents. Clean,
trustworthy, fast. **Not** an official university product — do not use official
university branding language or aesthetics.

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI runtime | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 (CSS-first) |
| Component primitives | shadcn v4 → Base UI (`@base-ui/react`) | ^1.5.0 |
| Form validation | react-hook-form + Zod | ^7.76 + ^4.4 |
| Form resolver | @hookform/resolvers | ^5.4 |
| Backend / DB | Supabase (Postgres + RLS + Realtime + Storage) | ^2.106 |
| Supabase SSR helper | @supabase/ssr | ^0.10 |
| Toasts | sonner | ^2 |
| Icons | lucide-react | ^1.16 |
| Date utilities | date-fns | ^4.3 |
| Animation | tw-animate-css | ^1.4 |

---

## Critical Version-Specific Gotchas

**Read these before touching any file — these are not hypothetical, they burned us.**

### Next.js 16 / React 19

- `cookies()`, `params`, and `searchParams` are **async**. Always `await` them:
  ```ts
  const { id } = await params;
  const cookieStore = await cookies();
  ```
- Server Components that use `useSearchParams` must be wrapped in `<Suspense>`.
- The `middleware.ts` file convention is **deprecated** in Next.js 16; it should be
  renamed to `proxy.ts`. Non-blocking for now — tracked in Outstanding Items.

### shadcn v4 / Base UI — NO `asChild` PROP

shadcn v4 is built on `@base-ui/react`, not Radix. **Base UI does not support the
`asChild` prop anywhere.** This is the single most common source of build errors.

**Do not write:**
```tsx
<Button asChild><Link href="/foo">...</Link></Button>
<DropdownMenuTrigger asChild><button>...</button></DropdownMenuTrigger>
<DropdownMenuItem asChild><Link href="/foo">...</Link></DropdownMenuItem>
<DialogTrigger asChild><button>...</button></DialogTrigger>
```

**Write instead:**
```tsx
// For Button-as-link:
<Link href="/foo" className={cn(buttonVariants({ size: 'sm' }), 'extra-classes')}>
  Label
</Link>

// For DropdownMenuTrigger — it renders its own element, put content inside directly:
<DropdownMenuTrigger className="your-classes">
  <Avatar>...</Avatar>
</DropdownMenuTrigger>

// For DropdownMenuItem that navigates — use router.push in onClick:
<DropdownMenuItem onClick={() => router.push('/profile')}>
  <User className="h-4 w-4 mr-2" /> My profile
</DropdownMenuItem>

// For DialogTrigger — use manual open state instead:
const [open, setOpen] = useState(false);
<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog open={open} onOpenChange={setOpen}>...</Dialog>
```

### Zod v4

- `error_map` is renamed to `error`.
- Enum arrays need `as const`:
  ```ts
  z.enum(['a', 'b', 'c'] as const, { message: 'Select one' })
  ```
- Use `{ message: '...' }` shorthand directly in most validators.

### @hookform/resolvers v5

- Import path unchanged: `import { zodResolver } from '@hookform/resolvers/zod'`
- Supports Zod v3 and v4 — no separate package needed.

### Supabase TypeScript (no `supabase gen types` yet)

`supabase gen types` has not been run against a live project. Without it, using the
`<Database>` generic on `createBrowserClient<Database>()` / `createServerClient<Database>()`
causes join query results to be typed as `never` (Supabase v2 requires `Relationships`
metadata for joins, which only `gen types` produces).

**Workaround in use throughout the codebase:**
- `createClient()` in `lib/supabase/client.ts` and `lib/supabase/server.ts` does
  **not** take a `<Database>` generic.
- Every query call site uses `as unknown as MyType` casts:
  ```ts
  const listing = result.data as unknown as ListingWithImages;
  const items = (result.data ?? []) as unknown as ListingWithImages[];
  ```
- `types/database.ts` has hand-written domain types (`ListingWithImages`,
  `ConversationWithDetails`, etc.) with `Relationships: []` included to satisfy the
  Supabase GenericSchema shape.

When a live project is connected and `supabase gen types` is run, remove the manual
types, re-add the `<Database>` generic, and remove the `as unknown as` casts.

### Tailwind v4 — CSS-first configuration

There is **no `tailwind.config.ts`**. Custom tokens live in `app/globals.css`
inside an `@theme inline` block:
```css
@theme inline {
  --color-maize: #ffcb05;
  --color-maize-dark: #e6b800;
  --color-um-blue: #00274c;
  --color-um-blue-light: #1a4a7a;
  --color-um-blue-muted: #e8edf2;
}
```
This automatically generates `bg-maize`, `text-um-blue`, `hover:bg-maize-dark`,
etc. as utility classes. Do not add a `tailwind.config.ts`.

### Supabase `.in()` with subquery builders

Supabase JS does not accept a query builder as the array argument to `.in()`.
Always split into two sequential queries — fetch IDs first, then use the array:
```ts
// Wrong:
.in('conversation_id', supabase.from('conversations').select('id').eq(...))

// Right:
const { data: convos } = await supabase.from('conversations').select('id').eq(...);
const ids = (convos ?? []).map((c) => (c as { id: string }).id);
await supabase.from('messages').select('*').in('conversation_id', ids);
```

---

## Project Structure

```
maize-market/
├── app/
│   ├── (auth)/              # Login, register, verify pages + auth layout
│   ├── (main)/              # All authenticated pages + main layout w/ Navbar
│   │   ├── page.tsx         # Home: hero + recent listings + seasonal CTA
│   │   ├── listings/        # Browse, new, [id] detail, [id]/edit
│   │   ├── messages/        # Inbox list + [id] conversation thread
│   │   └── profile/         # Own profile + [id] public profile
│   ├── api/auth/callback/   # Supabase OAuth/email callback handler
│   ├── globals.css          # Tailwind v4 @theme inline custom tokens
│   └── layout.tsx           # Root layout: fonts, <Toaster>, metadata
├── components/
│   ├── listings/            # ListingCard, ListingForm, ListingFilters, ImageUploader,
│   │                        #   ListingGrid, MarkSoldButton, ContactSellerButton
│   ├── messages/            # ConversationList, MessageThread (Realtime)
│   ├── profile/             # ProfileClient, MoveInDatePrompt, MoveInDatePromptWrapper
│   ├── shared/              # Navbar, EmptyState, EarlyBrowseNudge
│   └── ui/                  # shadcn primitives (button, input, dialog, etc.)
├── lib/
│   ├── supabase/            # client.ts, server.ts, middleware.ts
│   ├── constants.ts         # NEIGHBORHOODS, CATEGORIES, LOGISTICS_TIERS, STORAGE_BUCKET
│   ├── nudge.ts             # Season-aware nudge logic (pure functions)
│   └── utils.ts             # cn(), formatPrice(), dollarsToCents(), getImageUrl(), etc.
├── supabase/migrations/     # 00001_initial_schema.sql — full schema + RLS
├── types/
│   └── database.ts          # Hand-written domain types (ListingWithImages, etc.)
├── middleware.ts             # Route protection via updateSession()
└── public/
    └── placeholder-furniture.svg
```

---

## Database Schema

Single migration file: `supabase/migrations/00001_initial_schema.sql`

### Tables

**`profiles`** — one row per `auth.users` entry, created by trigger on signup.
- `id uuid PK` → FK → `auth.users(id) CASCADE`
- `email text UNIQUE NOT NULL`
- `display_name text NOT NULL` (defaults to username part of email)
- `move_in_date date` — nullable; drives nudge logic
- `created_at`, `updated_at timestamptz`

**`listings`**
- `id uuid PK DEFAULT gen_random_uuid()`
- `seller_id uuid` → FK → `profiles(id) CASCADE`
- `title text`, `description text`
- `price_cents integer CHECK (>= 0)` — always stored in cents
- `category listing_category` — enum: couch, desk, dresser, table, chair, bookshelf, bed_frame, other
- `logistics_tier logistics_tier` — enum: self_carry, two_person, truck_required
- `neighborhood text` — predefined list of 9 Ann Arbor areas
- `status listing_status DEFAULT 'active'` — enum: active, sold, deleted
- `expires_at timestamptz DEFAULT (now() + INTERVAL '90 days')` — amendment #7
- `search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || description)) STORED` — amendment #3
- `created_at`, `updated_at timestamptz`

**`listing_images`**
- `listing_id` → FK → `listings(id) CASCADE`
- `storage_path text` — path in Storage bucket: `{user_id}/{listing_id}/{uuid}.{ext}`
- `display_order integer DEFAULT 0`

**`conversations`**
- `listing_id`, `buyer_id`, `seller_id` — FK → respective tables
- `last_message_at timestamptz` — updated by trigger on message insert (amendment #4)
- `UNIQUE (listing_id, buyer_id)` — one thread per buyer per listing

**`messages`**
- `conversation_id`, `sender_id` — FK → respective tables
- `body text NOT NULL`
- `read_at timestamptz` — null means unread

### Triggers

- `trg_profiles_updated_at` / `trg_listings_updated_at` — BEFORE UPDATE, sets `updated_at = now()` (amendment #2)
- `trg_messages_sync_conversation` — AFTER INSERT ON messages, updates `conversations.last_message_at` (amendment #4)
- `trg_create_profile_on_signup` — AFTER INSERT ON auth.users, inserts profile row automatically

### Indexes

- GIN index on `listings.search_vector` for full-text search (amendment #3)
- Composite indexes on: `(status, created_at DESC)`, `(category) WHERE active`, `(expires_at) WHERE active`
- Index on `conversations.last_message_at DESC` for inbox sort
- Index on `messages (conversation_id, created_at ASC)` for thread fetch

### RLS Policies (all defined in initial migration — amendment #1)

- **profiles**: any authenticated user can SELECT; INSERT/UPDATE own row only
- **listings**: SELECT filters `status != 'deleted'` at RLS layer (amendment #8); INSERT/UPDATE/DELETE own rows only
- **listing_images**: SELECT open to authenticated; INSERT/DELETE only if `auth.uid() = listings.seller_id`
- **conversations**: SELECT/INSERT limited to participants (buyer or seller)
- **messages**: SELECT/INSERT limited to conversation participants; UPDATE (mark read) limited to non-sender participant

### Storage Bucket (amendment #5)

Bucket: `listing-images` (public, 10 MB limit per file, JPEG/PNG/WebP/HEIC)

Path convention: `{user_id}/{listing_id}/{uuid}.{ext}`

- SELECT policy: open to anyone (public bucket, CDN-served)
- INSERT policy: authenticated, `(storage.foldername(name))[1] = auth.uid()::text`
- DELETE policy: authenticated, same folder ownership check

---

## Schema Design Amendments

These 8 amendments were explicitly added to the original plan before build started.
Every one is implemented in the current codebase.

1. **All RLS policies in initial migration** — no deferred policies. Everything defined in `00001_initial_schema.sql`.
2. **`updated_at` triggers** — `profiles` and `listings` both have BEFORE UPDATE triggers calling `update_updated_at_column()`.
3. **`tsvector` full-text search** — `search_vector` generated column on `listings`, GIN-indexed. Used via `.textSearch('search_vector', q, { type: 'websearch' })`.
4. **`last_message_at` trigger** — DB trigger on `messages` INSERT syncs `conversations.last_message_at`; no app-level update needed.
5. **Storage bucket RLS** — images publicly readable; writes restricted to `{auth.uid()}/...` path prefix.
6. **Dual move-in season nudges** — `lib/nudge.ts` detects fall (June–August move-in) vs. winter (November–January move-in) and uses season-specific copy. Nudge windows: imminent (0–14 days), soon (15–45 days), early (46–180 days), null (>180 days or past).
7. **`expires_at` column** — defaults to `now() + INTERVAL '90 days'`. Indexed for efficient expiry queries. (Renewal UI not yet built.)
8. **Deleted listing filtering at RLS** — `status != 'deleted'` is in the SELECT RLS policy, so deleted listings are invisible to all queries without any app-level filtering.

---

## Nudge System

`lib/nudge.ts` — pure functions, safe in Server or Client Components.

```
getNudgeConfig(moveInDate, today?) → NudgeConfig | null
  Returns null if: move-in date is past, or more than 180 days away.

  Variant windows:
    'imminent'  0–14 days   → urgent tone
    'soon'      15–45 days  → warm tone
    'early'     46–180 days → info tone, season-aware copy
      fall (Jun–Aug move-in): Ann Arbor Aug 1 lease copy
      winter (Nov–Jan move-in): pre-January deal copy
      other: generic copy

getSetDateNudge() → NudgeConfig
  For users who haven't set move_in_date yet.
```

Move-in date prompt flow: auth callback redirects to `/?prompt_move_in=1` on first login. `app/(main)/layout.tsx` detects this param + no `move_in_date` → renders `<MoveInDatePromptWrapper>` (client component that auto-opens the dialog).

---

## Key Application Patterns

### Price

Always stored in **cents** (`price_cents integer`). Convert at boundaries:
- `dollarsToCents(str: string): number` — in `lib/utils.ts`
- `formatPrice(cents: number): string` — returns `"$0"` for free items

### Images

- `getImageUrl(storagePath: string): string` — builds public Supabase Storage URL
- `getPrimaryImageUrl(images: ListingImage[]): string` — lowest `display_order`, falls back to `/placeholder-furniture.svg`
- `ImageUploader` component manages pending local images before submission
- Listing ID is generated client-side with `crypto.randomUUID()` before upload so storage paths are stable

### Realtime (MessageThread)

```ts
supabase.channel(`conversation:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public',
      table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    (payload) => {
      setMessages(prev =>
        prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]
      );
    })
  .subscribe();
```

Optimistic insert with rollback on error. Dedup guard prevents doubles from optimistic + realtime event.

### URL-based filter state

`ListingFilters` reads `searchParams`, pushes updates to the URL via `router.push`. `app/(main)/listings/page.tsx` reads those params server-side and builds the Supabase query.

### Route protection

`middleware.ts` (currently — see Outstanding Items) calls `updateSession()` from `lib/supabase/middleware.ts`. Protected routes: `/messages/*`, `/profile/*`, `/listings/new`, `/listings/*/edit`. Authenticated users visiting `/login` or `/register` are redirected to `/`.

---

## Build Order (Phases 1–6)

### Phase 1 — Foundation
- [x] Database schema (tables, enums, triggers, RLS, storage bucket)
- [x] Supabase client helpers (browser, server, middleware)
- [x] Auth pages: register (umich.edu gate), login, email verify
- [x] Auth callback route (`/api/auth/callback`)
- [x] Route group layouts: `(auth)`, `(main)`
- [x] Navbar with UMich branding + unread count
- [x] Root layout (fonts, toaster, metadata)

### Phase 2 — Listings
- [x] Listing creation form (`ListingForm`, `ImageUploader`)
- [x] Image upload to Supabase Storage
- [x] `/listings/new` page
- [x] `/listings/[id]` detail page (images, price, logistics badge, seller info)
- [x] `/listings/[id]/edit` page
- [x] `MarkSoldButton` (confirms via dialog → patches status to 'sold')
- [x] `ContactSellerButton` (creates or finds conversation → navigates to thread)
- [x] Domain types in `types/database.ts`

### Phase 3 — Browse & Search
- [x] `/listings` browse page with server-side pagination
- [x] Full-text search via `search_vector` tsvector column
- [x] URL-based filter state (category, logistics tier, neighborhood, sort, search)
- [x] `ListingCard` component
- [x] `ListingGrid` with skeleton loading states
- [x] `ListingFilters` sidebar/panel

### Phase 4 — Messaging
- [x] `conversations` + `messages` table + RLS
- [x] `/messages` inbox page
- [x] `/messages/[id]` conversation page (two-panel: sidebar + thread)
- [x] `ConversationList` component
- [x] `MessageThread` with Supabase Realtime subscription
- [x] Optimistic message send with rollback
- [x] Unread count in Navbar (two-query pattern to avoid Supabase subquery limitation)

### Phase 5 — Profiles & Nudges
- [x] `/profile` (own profile, edit display name + move-in date)
- [x] `/profile/[id]` (public profile, active listings only)
- [x] `ProfileClient` with owner/viewer modes and Active/Sold tabs
- [x] `MoveInDatePrompt` dialog
- [x] First-login move-in date prompt (`?prompt_move_in=1` flow)
- [x] `EarlyBrowseNudge` banner component
- [x] Season-aware nudge logic in `lib/nudge.ts`

### Phase 6 — Polish (not yet started)
- [ ] Listing expiry: surface expiring-soon banner on seller's own listing; add "Renew" button that resets `expires_at`
- [ ] Read receipts: mark messages as read when thread is opened (`read_at` column exists, update logic not wired)
- [ ] Email notifications: integrate Resend with custom `@maizemarket.com` domain for new-message alerts (Supabase built-in email used for auth now)
- [ ] Image deletion in edit mode: UI to remove existing `listing_images` rows + Storage objects
- [ ] Listing deletion: soft-delete via `status = 'deleted'` (RLS hides it automatically)
- [ ] SEO / Open Graph: dynamic `og:image` for listing detail pages
- [ ] Accessibility audit: keyboard navigation, ARIA labels, focus management
- [ ] Mobile testing pass: real-device check of all flows

---

## Current Completion State

**Phases 1–5 are fully scaffolded.** The initial commit (`5c7da88`) contains all
code for Phases 1–5. Phase 6 items are unbuilt.

The build compiles cleanly (`npm run build` passes TypeScript and Webpack). The
only build-time failure is a Supabase client initialization error during static
prerendering, which is expected because `.env.local` does not exist yet — see
Outstanding Items below.

---

## Outstanding Items

### 1. Missing `.env.local` (blocker for `npm run dev` and `npm run build`)

Copy `.env.local.example` to `.env.local` and fill in the Supabase project URL
and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in the Supabase dashboard under **Project Settings → API**.

After creating the project, also run the migration:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 2. `middleware.ts` → `proxy.ts` deprecation (non-blocking)

Next.js 16 deprecates the `middleware.ts` file convention in favor of `proxy.ts`.
The current `middleware.ts` works but logs a deprecation warning on every build:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

To fix: rename `middleware.ts` to `proxy.ts` (no code changes needed). Do this
before upgrading to the next major Next.js version.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, controlled by RLS) |
