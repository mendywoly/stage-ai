-- Migration: Add user_id support for anonymous auth
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add user_id column to generations table
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);

-- 3. Update RLS policies for generations table

-- Drop old policies
DROP POLICY IF EXISTS "Public read access via share_uuid" ON generations;
DROP POLICY IF EXISTS "Public read images" ON images;
DROP POLICY IF EXISTS "Service role can insert generations" ON generations;
DROP POLICY IF EXISTS "Service role can update generations" ON generations;

-- Anyone can read a generation via share_uuid (public links)
CREATE POLICY "Public read via share_uuid" ON generations
  FOR SELECT
  USING (share_uuid IS NOT NULL);

-- Users can read their own generations
CREATE POLICY "Users read own generations" ON generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (for API routes)
CREATE POLICY "Service role insert" ON generations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role update" ON generations
  FOR UPDATE
  USING (true);

-- 4. Update RLS policies for images table

-- Users can read images from their own generations OR public share links
CREATE POLICY "Users read own images" ON images
  FOR SELECT
  USING (
    generation_id IN (
      SELECT id FROM generations
      WHERE user_id = auth.uid() OR share_uuid IS NOT NULL
    )
  );

-- Service role can still insert images (for processing)
-- (This policy should already exist from previous schema)

-- 5. Enable anonymous sign-ins
-- Note: You may need to enable this in the Supabase Dashboard UI instead
-- Dashboard → Authentication → Providers → Anonymous Sign-Ins → Enable

-- Alternatively, try this (may require superuser):
-- UPDATE auth.config SET value = 'true' WHERE parameter = 'enable_anonymous_users';

-- 6. Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generations'
  AND column_name = 'user_id';

-- Should return: user_id | uuid | YES
