-- Phase M2: Seed marketing legal pages
-- Seeds the 6 required legal pages from legal and terms .docx
-- Terms of Use, Privacy Notice, Cookie Notice, AI Use Notice, Brand Notice, Ecosystem Relationship

BEGIN;

-- Ensure dos schema exists
CREATE SCHEMA IF NOT EXISTS dos;

-- Create dos.marketing_pages table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'dos' AND table_name = 'marketing_pages'
  ) THEN
    CREATE TABLE dos.marketing_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      content_en TEXT,
      content_ar TEXT,
      last_updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_marketing_pages_slug ON dos.marketing_pages(slug);
  END IF;
END $$;

-- Seed the 6 required legal pages
INSERT INTO dos.marketing_pages (slug, title_en, title_ar, content_en, content_ar) VALUES
  ('/legal/terms', 'Terms of Use', 'شروط الاستخدام', 
   'Terms of Use content placeholder - Last updated: [LAST_UPDATED_DATE]', 
   'محتوى شروط الاستخدام - آخر تحديث: [LAST_UPDATED_DATE]'),
  ('/legal/privacy', 'Privacy Notice', 'إشعار الخصوصية', 
   'Privacy Notice content placeholder - Last updated: [LAST_UPDATED_DATE]', 
   'محتوى إشعار الخصوصية - آخر تحديث: [LAST_UPDATED_DATE]'),
  ('/legal/cookies', 'Cookie Notice', 'إشعار ملفات تعريف الارتباط', 
   'Cookie Notice content placeholder - Last updated: [LAST_UPDATED_DATE]', 
   'محتوى إشعار ملفات تعريف الارتباط - آخر تحديث: [LAST_UPDATED_DATE]'),
  ('/legal/ai-use', 'AI Use Notice', 'إشعار استخدام الذكاء الاصطناعي', 
   'AI Use Notice content placeholder - Last updated: [LAST_UPDATED_DATE]', 
   'محتوى إشعار استخدام الذكاء الاصطناعي - آخر تحديث: [LAST_UPDATED_DATE]'),
  ('/legal/brand', 'Brand and Trademark Notice', 'إشعار العلامة والهوية التجارية', 
   'Brand and Trademark Notice content placeholder - Last updated: [LAST_UPDATED_DATE]', 
   'محتوى إشعار العلامة والهوية التجارية - آخر تحديث: [LAST_UPDATED_DATE]'),
  ('/legal/relationship', 'Relationship Between Dogan Ecosystem Sites', 'العلاقة بين مواقع منظومة Dogan', 
   'Ecosystem Relationship Notice content placeholder - Last updated: [LAST_UPDATED_DATE]', 
   'محتوى إشعار العلاقة بين مواقع منظومة Dogan - آخر تحديث: [LAST_UPDATED_DATE]')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
