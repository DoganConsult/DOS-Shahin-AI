-- Phase M2: Seed Shahin-AI brand configuration
-- Seeds brand configuration from Branding.docx
-- Uses --shahin-* token prefix, falcon icon, brand colors

BEGIN;

-- Ensure dos schema exists
CREATE SCHEMA IF NOT EXISTS dos;

-- Create dos.brand_config table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'dos' AND table_name = 'brand_config'
  ) THEN
    CREATE TABLE dos.brand_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain TEXT NOT NULL UNIQUE,
      brand_color_primary TEXT NOT NULL,
      brand_color_accent TEXT NOT NULL,
      brand_color_background TEXT NOT NULL,
      brand_color_surface TEXT NOT NULL,
      brand_color_text TEXT NOT NULL,
      brand_color_muted TEXT NOT NULL,
      brand_icon TEXT NOT NULL,
      brand_token_prefix TEXT NOT NULL,
      dogan_meaning_en TEXT NOT NULL,
      dogan_meaning_ar TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_brand_config_domain ON dos.brand_config(domain);
  END IF;
END $$;

-- Seed Shahin-AI brand configuration
INSERT INTO dos.brand_config (
  domain,
  brand_color_primary,
  brand_color_accent,
  brand_color_background,
  brand_color_surface,
  brand_color_text,
  brand_color_muted,
  brand_icon,
  brand_token_prefix,
  dogan_meaning_en,
  dogan_meaning_ar
) VALUES (
  'shahin-ai.com',
  '#075cff',
  '#f6c400',
  '#f8fafc',
  '#ffffff',
  '#111827',
  '#6b7280',
  'falcon',
  '--shahin-*',
  'Falcon',
  'الصقر / الشاهين'
) ON CONFLICT (domain) DO NOTHING;

COMMIT;
