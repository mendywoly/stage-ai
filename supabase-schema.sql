-- StageAI Supabase Schema
-- Run this in your Supabase SQL Editor

-- Create generations table
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Payment tracking
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount_paid INTEGER, -- in cents (e.g., 1500 = $15.00)
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'promo'
  promo_code_used TEXT, -- track which promo code was used

  -- Input images
  num_images INTEGER NOT NULL,
  style_id TEXT NOT NULL,
  custom_prompt TEXT,

  -- Processing status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,

  -- Results
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Access
  share_uuid TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex')
);

-- Create promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  code TEXT UNIQUE NOT NULL, -- e.g., 'WELCOME', 'LAUNCH2025'
  max_uses INTEGER DEFAULT 1, -- how many times this code can be used (null = unlimited)
  times_used INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE, -- optional expiry
  is_active BOOLEAN DEFAULT true,

  -- What the code gives
  free_images INTEGER DEFAULT 1, -- how many images are free (1 = one free generation)

  -- Tracking
  created_by TEXT, -- optional: who created this code
  notes TEXT -- optional: internal notes
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);

-- RLS for promo codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active promo codes (to validate them)
CREATE POLICY "Public can read active promo codes" ON promo_codes
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Only service role can insert/update promo codes
CREATE POLICY "Service role can manage promo codes" ON promo_codes
  FOR ALL
  USING (true);

-- Insert a default "WELCOME" promo code (1 free image, unlimited uses)
INSERT INTO promo_codes (code, max_uses, free_images, notes)
VALUES ('WELCOME', NULL, 1, 'Default welcome code - 1 free image')
ON CONFLICT (code) DO NOTHING;

-- Helper function to atomically increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes
  SET times_used = times_used + 1
  WHERE code = promo_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create images table (stores both uploads and results)
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,

  -- Image metadata
  type TEXT NOT NULL, -- 'upload' or 'result'
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER,

  -- For result images
  variation_index INTEGER, -- 0, 1, or 2
  original_image_id UUID REFERENCES images(id), -- links result back to its upload

  -- Order for uploads
  upload_order INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generations_share_uuid ON generations(share_uuid);
CREATE INDEX IF NOT EXISTS idx_generations_stripe_session ON generations(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_images_generation ON images(generation_id);

-- Enable Row Level Security (RLS)
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Public access policies
-- Anyone can read a generation if they have the share_uuid
CREATE POLICY "Public read access via share_uuid" ON generations
  FOR SELECT
  USING (true);

-- Anyone can read images for a generation they have access to
CREATE POLICY "Public read images" ON images
  FOR SELECT
  USING (true);

-- Server-side only writes (use service role key)
CREATE POLICY "Service role can insert generations" ON generations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update generations" ON generations
  FOR UPDATE
  USING (true);

CREATE POLICY "Service role can insert images" ON images
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for images
-- Run this after creating the above tables

-- In Supabase Dashboard, go to Storage and create a bucket called 'stage-images'
-- Set it to PUBLIC so images are accessible via direct URLs
-- Or create it via SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('stage-images', 'stage-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'stage-images');

CREATE POLICY "Service role can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'stage-images');
