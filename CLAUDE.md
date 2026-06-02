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
- **Layouts do NOT receive `searchParams`** — only pages do. Do not add
  `searchParams` to a layout's props and expect it to work.
- The `middleware.ts` file convention is **deprecated** in Next.js 16 and has been
  renamed to `proxy.ts` (done — see `proxy.ts` in the project root). The exported
  function is also renamed from `middleware` to `proxy`.

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

### Supabase migrations — always include `GRANT` statements — CRITICAL

PostgreSQL has **two independent access-control layers**:

1. **Table-level privileges** (`GRANT SELECT ON table TO role`) — the role must
   have permission to touch the table at all.
2. **Row Level Security (RLS)** — filters which rows a role can see once it has
   table-level access.

When you create tables in the Supabase dashboard or SQL editor, Supabase
automatically runs `ALTER DEFAULT PRIVILEGES` grants. But when you use
`supabase db push` with raw SQL migrations, **those defaults do NOT apply** to
your tables — you get exactly what your migration file contains.

Without `GRANT` statements every query returns:
```json
{ "code": "42501", "message": "permission denied for table listings" }
```
This looks like a 401 from the API and causes the error-fallback UI to render.

**Every migration that creates a new table must include explicit grants.**
Template to copy:

```sql
-- authenticated users (mirrors the RLS policies you've defined)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_table TO authenticated;

-- anon (if the table should be publicly browsable — no login required)
GRANT SELECT ON public.my_table TO anon;

-- and a matching anon RLS policy if you granted SELECT to anon:
CREATE POLICY "my_table_select_anon"
  ON my_table FOR SELECT TO anon
  USING (<same condition as the authenticated SELECT policy>);
```

This was the root cause of both the "something went wrong loading listings" error
**and** the Navbar always showing Login/Signup even after login (the profile fetch
in `onAuthStateChange` also returned null due to the missing `profiles` grant).
Fixed in migration `00003_grant_table_privileges.sql`.

### `'use client'` is required for any component with event handlers

Any component that passes an event handler (`onError`, `onClick`, `onChange`,
`onSubmit`, etc.) to a DOM element or to a Next.js built-in Client Component
(e.g. `<Image>`, `<Link>`) **must** carry a `'use client'` directive, even
if the component feels purely presentational.

Without `'use client'`, Next.js treats the file as a Server Component and
throws at runtime:

```
Error: Event handlers cannot be passed to Client Component props.
```

**Common trap — `<Image onError={...}>`:**
```tsx
// ✗ Server Component — crashes at runtime
export function ListingCard() {
  return <Image onError={(e) => { ... }} ... />;
}

// ✓ Client Component — works correctly
'use client';
export function ListingCard() {
  return <Image onError={(e) => { ... }} ... />;
}
```

The component's *parent* does not need `'use client'` — Server Components are
allowed to import and render Client Components. Only the file that owns the
event handler needs the directive.

This burned us in `ListingCard.tsx` (fixed in commit `4da31eb`).

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

### Supabase auth cookies on redirect responses — CRITICAL

When a Route Handler or middleware creates a `NextResponse.redirect()`, session
cookies written via `setAll` (from `exchangeCodeForSession`, `verifyOtp`, or a
session refresh) are **not carried automatically** because the redirect is a new
response object. Always collect the cookies from `setAll` and set them on the
redirect response explicitly:

```ts
// WRONG — cookies go nowhere:
const { error } = await supabase.auth.exchangeCodeForSession(code);
return NextResponse.redirect(destination);

// RIGHT — collect first, then attach:
const pending: { name: string; value: string; options: object }[] = [];
const supabase = createServerClient(url, key, {
  cookies: {
    getAll: () => cookieStore.getAll(),
    setAll: (cs) => cs.forEach((c) => pending.push(c)),   // collect
  },
});
const { error } = await supabase.auth.exchangeCodeForSession(code);
const response = NextResponse.redirect(destination);
pending.forEach(({ name, value, options }) =>
  response.cookies.set(name, value, options as ...)      // attach
);
return response;
```

The same applies in middleware: use the `withSessionCookies()` helper defined
in `lib/supabase/middleware.ts` whenever returning a redirect instead of
`supabaseResponse`.

### Next.js Data Cache and `getUser()` in layouts

`supabase.auth.getUser()` makes a GET fetch to `/auth/v1/user`. Next.js's Data
Cache can memoize this and serve a stale `null` response after the user logs in,
causing layouts to think the user isn't authenticated.

**Any layout or page that renders auth-sensitive UI must:**
```ts
export const dynamic = 'force-dynamic';   // top of file
// AND inside the component:
import { unstable_noStore as noStore } from 'next/cache';
noStore();
```

`(main)/layout.tsx` already has both. **Do not remove them.**

### Navbar auth state — must use `onAuthStateChange`

The Navbar is a `'use client'` component. **Do not** make it a pure function of a
server-provided `profile` prop. The server prop is only the initial state. The
Navbar subscribes to `supabase.auth.onAuthStateChange` to stay correct through the
full session lifetime:

```ts
const supabase = useRef(createClient()).current;   // stable ref, never recreated

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!session?.user) { setProfile(null); return; }
      const { data } = await supabase.from('profiles').select('*')
        .eq('id', session.user.id).single();
      setProfile(data as Profile | null);
    }
  );
  return () => subscription.unsubscribe();
}, [supabase]);
```

`onAuthStateChange` fires immediately with `INITIAL_SESSION` on mount, which
self-corrects any stale server prop before the user sees it.

### Post-login navigation — use `window.location.href`

After `signInWithPassword()` succeeds, use a hard navigation instead of
`router.push() + router.refresh()`. Hard navigation guarantees a fresh server
render (reading the freshly-set session cookies) and avoids router-cache timing
issues:

```ts
window.location.href = next;   // in the login form's onSubmit
```

---

## Project Structure

```
maize-market/
├── app/
│   ├── page.tsx             # Redirects / → /listings (outside route groups)
│   ├── (auth)/              # Login, register, verify pages + auth layout
│   ├── (main)/              # Authenticated shell — Navbar, footer, nudge banner
│   │   ├── layout.tsx       # force-dynamic + noStore; profile safety-net upsert
│   │   ├── page.tsx         # Hero page (NOTE: unreachable — shadowed by app/page.tsx)
│   │   ├── listings/        # Browse, new, [id] detail, [id]/edit
│   │   ├── messages/        # Inbox list + [id] conversation thread
│   │   └── profile/         # Own profile + [id] public profile
│   ├── api/auth/callback/   # PKCE + OTP email verification handler
│   ├── globals.css          # Tailwind v4 @theme inline custom tokens
│   └── layout.tsx           # Root layout: fonts, <Toaster>, metadata
├── components/
│   ├── listings/            # ListingCard, ListingForm, ListingFilters, ImageUploader,
│   │                        #   ListingGrid, MarkSoldButton, ContactSellerButton
│   ├── messages/            # ConversationList, MessageThread (Realtime)
│   ├── profile/             # ProfileClient, MoveInDatePrompt, MoveInDatePromptWrapper
│   ├── shared/              # Navbar (onAuthStateChange), EmptyState, EarlyBrowseNudge
│   └── ui/                  # shadcn primitives (button, input, dialog, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # createBrowserClient() — no <Database> generic
│   │   ├── server.ts        # createServerClient() via await cookies()
│   │   └── middleware.ts    # updateSession() + withSessionCookies() helper
│   ├── constants.ts         # NEIGHBORHOODS, CATEGORIES, LOGISTICS_TIERS, STORAGE_BUCKET
│   ├── nudge.ts             # Season-aware nudge logic (pure functions)
│   └── utils.ts             # cn(), formatPrice(), dollarsToCents(), getImageUrl(), etc.
├── supabase/
│   ├── config.toml          # Created by `supabase init` (project: maize-market)
│   └── migrations/
│       ├── 00001_initial_schema.sql   # Full schema, RLS, triggers, storage bucket
│       └── 00002_enable_realtime.sql  # ALTER PUBLICATION supabase_realtime ADD TABLE messages
├── types/
│   └── database.ts          # Hand-written domain types (ListingWithImages, etc.)
├── proxy.ts                  # Route protection (renamed from middleware.ts per Next.js 16)
├── next.config.ts           # remotePatterns for Supabase Storage hostname
└── public/
    └── placeholder-furniture.svg
```

> **Note on `app/page.tsx` vs `app/(main)/page.tsx`:** Both resolve to `/`.
> `app/page.tsx` takes precedence and immediately redirects to `/listings`.
> The hero page at `app/(main)/page.tsx` is currently unreachable. If you want
> the hero at `/`, delete `app/page.tsx`.

---

## Live Supabase Project

| Field | Value |
|---|---|
| Project name | maize-market |
| Region | East US (us-east-1) |
| Project URL | `https://epalutgizprnnzzpdeyk.supabase.co` |
| Project ref | `epalutgizprnnzzpdeyk` |
| Supabase CLI | v2.101.0 (installed via Homebrew) |

Credentials live in `.env.local` (gitignored). See `.env.local.example` for the
required variable names.

### Live Production Deployment

| Field | Value |
|---|---|
| Platform | Vercel (Hobby) |
| Production URL | `https://maize-market-peach.vercel.app` |
| Git branch | `main` (auto-deploys on every push) |

**Vercel environment variables** (set under Settings → Environment Variables,
Production + Preview environments):

| Variable | Set? |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |

**Supabase Auth redirect URL allowlist** (Authentication → URL Configuration):
- Site URL: `https://maize-market-peach.vercel.app`
- Redirect URLs: `https://maize-market-peach.vercel.app/**`, `http://localhost:3000/**`

When adding a custom domain, add it to both the Vercel project (Settings →
Domains) and the Supabase redirect URL allowlist.

### Pushing future migrations

```bash
# URL-encode special chars in the password (! → %21, @ → %40, etc.)
supabase db push --db-url "postgresql://postgres:<encoded-password>@db.epalutgizprnnzzpdeyk.supabase.co:5432/postgres"
```

### Migrations applied

| File | What it does |
|---|---|
| `00001_initial_schema.sql` | Tables, enums, indexes, triggers, RLS policies, storage bucket |
| `00002_enable_realtime.sql` | Adds `messages` to `supabase_realtime` publication (required for `postgres_changes` subscriptions) |
| `00003_grant_table_privileges.sql` | `GRANT` statements for `authenticated` (all tables) and `anon` (`listings`, `listing_images`); adds anon SELECT RLS policies for public browsing |

---

## Database Schema

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

**Known issue with the prompt_move_in flow:** The original design redirected to
`/?prompt_move_in=1` after email verification and read that param in
`(main)/layout.tsx`. But **layouts do not receive `searchParams` in Next.js App
Router** (only pages do). The `showMoveInPrompt` logic in the layout is currently
dead code. The auth callback now redirects to `/listings` directly (no query
param). A future fix should trigger the dialog via a different mechanism (e.g. a
short-lived cookie checked by the layout, or checking `profile.move_in_date` on
every load).

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
- `next.config.ts` has `remotePatterns` for `epalutgizprnnzzpdeyk.supabase.co` so `next/image` can serve listing photos

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

Realtime works because `00002_enable_realtime.sql` adds `messages` to the
`supabase_realtime` publication. Optimistic insert with rollback on error. Dedup
guard prevents doubles from optimistic + realtime event.

### URL-based filter state

`ListingFilters` reads `searchParams`, pushes updates to the URL via `router.push`. `app/(main)/listings/page.tsx` reads those params server-side and builds the Supabase query.

### Route protection

`middleware.ts` calls `updateSession()` from `lib/supabase/middleware.ts`. Protected
routes: `/messages/*`, `/profile/*`, `/listings/new`, `/listings/*/edit`.
Authenticated users visiting `/login` or `/register` are redirected to `/listings`.
All redirect responses go through `withSessionCookies()` to carry refreshed tokens.

### Auth callback (`/api/auth/callback`)

Handles two flows:
1. **PKCE** (`?code=xxx`) — `exchangeCodeForSession(code)`
2. **OTP fallback** (`?token_hash=xxx&type=signup`) — `verifyOtp({ type, token_hash })`

Both collect cookies via `setAll` into a local array and attach them to the
`NextResponse.redirect()` before returning. Default destination is `/listings`.
A `?next=/path` param is honoured for deep-linking (same-origin only).

---

## Build Order (Phases 1–6)

### Phase 1 — Foundation
- [x] Database schema (tables, enums, triggers, RLS, storage bucket)
- [x] Supabase client helpers (browser, server, middleware)
- [x] Auth pages: register (umich.edu gate), login, email verify
- [x] Auth callback route (`/api/auth/callback`) — PKCE + OTP, cookies fixed
- [x] Route group layouts: `(auth)`, `(main)`
- [x] Navbar with UMich branding + unread count + client-side auth subscription
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
- [x] First-login move-in date prompt (partially broken — see Known Issues)
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
- [ ] Fix `prompt_move_in` flow: use a cookie-based mechanism instead of a layout `searchParams` prop

---

## Current Completion State

**Phases 1–5 are complete and all core user flows are verified working
end-to-end against the live Supabase project:**

- Register (umich.edu gate) → email verification → login → Navbar shows account
- Create a listing (images upload to Storage, listing appears in browse)
- Browse listings (public, no login required; filters, search, pagination work)
- View listing detail → Contact Seller → message thread with Realtime updates
- Mark listing as sold → status updates, sold overlay appears on card
- Profile page (own: edit name/move-in date, Active/Sold tabs; public: view seller)
- Unread message count in Navbar updates correctly

Phase 6 items are unbuilt (see below).

The build compiles cleanly with zero TypeScript errors (`npm run build` passes).
The app is deployed to production at `https://maize-market-peach.vercel.app`
and auto-deploys on every push to `main`.

Three runtime bugs fixed since initial deployment: auth cookie forwarding on
redirect, missing table-level GRANTs (`00003`), and `ListingCard` missing
`'use client'` for its `onError` handler.

---

## Outstanding Items

### 1. `app/(main)/page.tsx` hero page is unreachable (low priority)

`app/page.tsx` redirects `/` → `/listings`, shadowing `app/(main)/page.tsx` which
has the hero, trust signals, and recent listings. If you want the hero page
accessible at `/`, delete `app/page.tsx`.

### 2. `prompt_move_in` dialog does not fire (medium priority)

Layouts do not receive `searchParams` in Next.js App Router, so the
`showMoveInPrompt` check in `(main)/layout.tsx` is dead code. The move-in date
dialog never auto-opens after first login. Fix by replacing the URL-param
mechanism with a short-lived cookie (`first_login=1`) that the layout sets/reads
directly, or by always showing the prompt to users with no `move_in_date`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, controlled by RLS) |
