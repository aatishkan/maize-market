-- =============================================================
-- MaizeMarket — Grant table-level privileges
-- =============================================================
-- The initial migration created tables and RLS policies but did not include
-- GRANT statements. PostgreSQL requires explicit GRANTs before RLS even runs.
-- Without these, every query returns 401 "permission denied for table …"
-- regardless of the RLS policies defined.
-- =============================================================

-- ── authenticated (signed-in users) ──────────────────────────
-- Grants must match the operations allowed by the RLS policies in 00001.
GRANT SELECT, INSERT, UPDATE         ON public.profiles       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings        TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.listing_images  TO authenticated;
GRANT SELECT, INSERT                 ON public.conversations   TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.messages        TO authenticated;

-- ── anon (unauthenticated visitors) ──────────────────────────
-- The /listings browse page is intentionally not protected by middleware so
-- that visitors can see what's available before signing up. Grant SELECT on
-- the two public-facing tables; RLS policies below restrict visible rows.
GRANT SELECT ON public.listings       TO anon;
GRANT SELECT ON public.listing_images TO anon;

-- ── Anon RLS policies for public browsing ────────────────────
-- Mirror the authenticated SELECT policies so unauthenticated visitors see
-- the same non-deleted listings (and their images) that logged-in users see.

CREATE POLICY "listings_select_anon_non_deleted"
  ON listings FOR SELECT TO anon
  USING (status != 'deleted');

CREATE POLICY "listing_images_select_anon"
  ON listing_images FOR SELECT TO anon
  USING (true);
