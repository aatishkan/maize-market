-- =============================================================
-- MaizeMarket — Initial Schema
-- =============================================================
-- Includes: tables, indexes, triggers, RLS policies, storage bucket
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE TYPE listing_category AS ENUM (
  'couch',
  'desk',
  'dresser',
  'table',
  'chair',
  'bookshelf',
  'bed_frame',
  'other'
);

CREATE TYPE logistics_tier AS ENUM (
  'self_carry',     -- one person, fits in a car
  'two_person',     -- needs a second person or SUV
  'truck_required'  -- large/heavy, needs a truck
);

CREATE TYPE listing_status AS ENUM ('active', 'sold', 'deleted');

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

-- profiles: one row per auth.user, created automatically via trigger
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text UNIQUE NOT NULL,
  display_name  text NOT NULL,
  move_in_date  date,                  -- nullable; drives nudge logic
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE listings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text NOT NULL,
  price_cents    integer NOT NULL CHECK (price_cents >= 0),
  category       listing_category NOT NULL,
  logistics_tier logistics_tier NOT NULL,
  neighborhood   text NOT NULL,
  status         listing_status DEFAULT 'active' NOT NULL,
  -- Auto-expire 90 days after creation; sellers can renew
  expires_at     timestamptz DEFAULT (now() + INTERVAL '90 days') NOT NULL,
  -- Full-text search: stored generated column, GIN-indexed below
  search_vector  tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) STORED,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE listing_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  -- Path in Supabase Storage bucket "listing-images": {user_id}/{listing_id}/{filename}
  storage_path  text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at  timestamptz DEFAULT now() NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL,
  -- One thread per buyer per listing
  UNIQUE (listing_id, buyer_id)
);

CREATE TABLE messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body             text NOT NULL,
  read_at          timestamptz,     -- null = unread
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX idx_listings_seller_id           ON listings (seller_id);
CREATE INDEX idx_listings_status_created      ON listings (status, created_at DESC);
CREATE INDEX idx_listings_category_active     ON listings (category) WHERE status = 'active';
CREATE INDEX idx_listings_expires_at_active   ON listings (expires_at) WHERE status = 'active';
CREATE INDEX idx_listing_images_listing_order ON listing_images (listing_id, display_order);
CREATE INDEX idx_conversations_buyer_id       ON conversations (buyer_id);
CREATE INDEX idx_conversations_seller_id      ON conversations (seller_id);
CREATE INDEX idx_conversations_last_message   ON conversations (last_message_at DESC);
CREATE INDEX idx_messages_conversation_time   ON messages (conversation_id, created_at ASC);

-- Full-text search GIN index (amendment #3)
CREATE INDEX idx_listings_search_vector ON listings USING GIN (search_vector);

-- ─────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION: updated_at (amendment #2)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION: conversations.last_message_at (amendment #4)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_conversation_last_message_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_sync_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_conversation_last_message_at();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION: auto-create profile on signup
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Default display name: part before @ in email
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (amendment #1 — defined in initial migration)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────
-- Any authenticated user can read any profile (needed for seller info on listings).
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- Users can only insert their own profile (handled by trigger, but guard it too).
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile.
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── listings ─────────────────────────────────────────────────
-- Amendment #8: deleted listings are invisible at the RLS layer.
-- Any authenticated user can see active or sold listings.
CREATE POLICY "listings_select_non_deleted"
  ON listings FOR SELECT TO authenticated
  USING (status != 'deleted');

-- Only the seller can create their own listings.
CREATE POLICY "listings_insert_own"
  ON listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Only the seller can update their own listings.
CREATE POLICY "listings_update_own"
  ON listings FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can hard-delete their own listings (soft-delete preferred at app layer).
CREATE POLICY "listings_delete_own"
  ON listings FOR DELETE TO authenticated
  USING (auth.uid() = seller_id);

-- ── listing_images ────────────────────────────────────────────
-- Any authenticated user can read images (images are already publicly served via Storage).
CREATE POLICY "listing_images_select"
  ON listing_images FOR SELECT TO authenticated
  USING (true);

-- Only the listing's seller can insert images.
CREATE POLICY "listing_images_insert_own"
  ON listing_images FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = (
      SELECT seller_id FROM listings WHERE id = listing_id
    )
  );

-- Only the listing's seller can delete images.
CREATE POLICY "listing_images_delete_own"
  ON listing_images FOR DELETE TO authenticated
  USING (
    auth.uid() = (
      SELECT seller_id FROM listings WHERE id = listing_id
    )
  );

-- ── conversations ─────────────────────────────────────────────
-- Only participants can see their conversations.
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Only the buyer can initiate a conversation (as the requester).
CREATE POLICY "conversations_insert_buyer"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- ── messages ─────────────────────────────────────────────────
-- Only conversation participants can read messages.
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT TO authenticated
  USING (
    auth.uid() = (SELECT buyer_id  FROM conversations WHERE id = conversation_id)
    OR
    auth.uid() = (SELECT seller_id FROM conversations WHERE id = conversation_id)
  );

-- Only participants can send messages, and sender_id must match the caller.
CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = (SELECT buyer_id  FROM conversations WHERE id = conversation_id)
      OR
      auth.uid() = (SELECT seller_id FROM conversations WHERE id = conversation_id)
    )
  );

-- Only the recipient can mark a message as read.
CREATE POLICY "messages_update_read_at"
  ON messages FOR UPDATE TO authenticated
  USING (
    auth.uid() != sender_id
    AND (
      auth.uid() = (SELECT buyer_id  FROM conversations WHERE id = conversation_id)
      OR
      auth.uid() = (SELECT seller_id FROM conversations WHERE id = conversation_id)
    )
  )
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKET & RLS (amendment #5)
-- ─────────────────────────────────────────────────────────────
-- Convention: all images stored as {user_id}/{listing_id}/{uuid}.{ext}
-- Public bucket = GET requests don't require auth (CDN-served).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone (including anonymous) can read images — they're public.
CREATE POLICY "storage_listing_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Only authenticated users can upload; path must start with their own user_id.
-- This ensures you can only write to your own folder: {auth.uid()}/...
CREATE POLICY "storage_listing_images_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the owner of the folder can delete images.
CREATE POLICY "storage_listing_images_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
