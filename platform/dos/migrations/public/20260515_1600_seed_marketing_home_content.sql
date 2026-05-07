-- Phase M3: Seed full marketing home content
-- Seeds MarketingHomeContent with knowledge pack content, branding, and legal configuration
-- Uses verbatim copy from company-knowledge-pack and Branding.docx

BEGIN;

-- Ensure dos schema exists
CREATE SCHEMA IF NOT EXISTS dos;

-- Create dos.marketing_home_content table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'dos' AND table_name = 'marketing_home_content'
  ) THEN
    CREATE TABLE dos.marketing_home_content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_code TEXT NOT NULL,
      locale TEXT NOT NULL,
      content JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(brand_code, locale)
    );
    
    CREATE INDEX idx_marketing_home_content_brand_locale ON dos.marketing_home_content(brand_code, locale);
  END IF;
END $$;

-- Seed Shahin-AI marketing home content (English)
INSERT INTO dos.marketing_home_content (brand_code, locale, content) VALUES
('shahin-ai', 'en', jsonb_build_object(
  'brandLabel', 'Shahin-AI',
  'copyright', '© 2026 Dogan Consult. All rights reserved.',
  'logoHref', '/',
  'brandConfig', jsonb_build_object(
    'brandColorPrimary', '#075cff',
    'brandColorAccent', '#f6c400',
    'brandColorBackground', '#f8fafc',
    'brandColorSurface', '#ffffff',
    'brandColorText', '#111827',
    'brandColorMuted', '#6b7280',
    'brandIcon', 'falcon',
    'brandTokenPrefix', '--shahin-*',
    'doganMeaningEn', 'Falcon',
    'doganMeaningAr', 'الصقر / الشاهين'
  ),
  'legalConfig', jsonb_build_object(
    'legalEntityName', 'Dogan Consult',
    'commercialRegistrationNumber', '[COMMERCIAL_REGISTRATION_NUMBER]',
    'vatNumber', '[VAT_NUMBER]',
    'registeredAddress', '[REGISTERED_ADDRESS]',
    'supportEmail', '[SUPPORT_EMAIL]',
    'billingEmail', '[BILLING_EMAIL]',
    'country', 'Saudi Arabia',
    'lastUpdated', '2026-05-15'
  ),
  'footerConfig', jsonb_build_object(
    'legalPages', jsonb_build_array(
      jsonb_build_object('slug', '/legal/terms', 'title_en', 'Terms of Use', 'title_ar', 'شروط الاستخدام'),
      jsonb_build_object('slug', '/legal/privacy', 'title_en', 'Privacy Notice', 'title_ar', 'إشعار الخصوصية'),
      jsonb_build_object('slug', '/legal/cookies', 'title_en', 'Cookie Notice', 'title_ar', 'إشعار ملفات تعريف الارتباط'),
      jsonb_build_object('slug', '/legal/ai-use', 'title_en', 'AI Use Notice', 'title_ar', 'إشعار استخدام الذكاء الاصطناعي'),
      jsonb_build_object('slug', '/legal/brand', 'title_en', 'Brand Notice', 'title_ar', 'إشعار العلامة والهوية التجارية'),
      jsonb_build_object('slug', '/legal/relationship', 'title_en', 'Ecosystem Relationship', 'title_ar', 'العلاقة بين مواقع منظومة Dogan')
    ),
    'ecosystemNoticeEn', 'Part of the Dogan ecosystem. Each product, platform, initiative, portal, service, or profile may operate under its own purpose, scope, terms, privacy notice, and commercial structure. Dogan / Doğan is a Turkish name meaning falcon. It is not related to the English word dog.',
    'ecosystemNoticeAr', 'جزء من منظومة Dogan. قد يكون لكل منتج أو منصة أو مبادرة أو بوابة أو خدمة أو ملف شخصي غرضه ونطاقه وشروطه وإشعار الخصوصية والهيكل التجاري الخاص به. Dogan / Doğan اسم تركي معناه الصقر أو الشاهين، ولا يرتبط بكلمة Dog الإنجليزية.'
  ),
  'uiLabels', jsonb_build_object(
    'headerMenuLabel', 'Menu',
    'mobileMenuLabel', 'Menu',
    'heroTrustLabel', 'Trusted by',
    'valuePropsEyebrow', 'Why Shahin-AI',
    'valuePropsTitle', 'Enterprise GRC Platform',
    'valuePropsSub', 'Governed products, regulated SaaS, sovereign deployments',
    'heroProofStatus', 'Live',
    'heroProofTitle', 'AI-Powered GRC',
    'heroProofBody', 'Shahin-AI by Dogan Consult, powered by Dogan-AI OS',
    'heroEvidenceReceipt', 'Platform verified',
    'heroProofStatusItems', jsonb_build_array(),
    'heroTimelineSteps', jsonb_build_array()
  ),
  'hero', jsonb_build_object(
    'badge', 'AI-Native GRC',
    'eyebrow', 'Shahin-AI by Dogan Consult',
    'title', 'Governance, Risk & Compliance Platform',
    'sub', 'Powered by Dogan-AI OS - The modular operating system for high-trust software',
    'microcopy', 'Enterprise-grade GRC workspace for regulated industries',
    'ctaPrimary', jsonb_build_object('label', 'Get Started', 'href', '/contact'),
    'ctaSecondary', jsonb_build_object('label', 'Learn More', 'href', '/about')
  ),
  'trustPills', jsonb_build_array(
    jsonb_build_object('id', 'trust-1', 'label', 'KSA/GCC Ready'),
    jsonb_build_object('id', 'trust-2', 'label', 'ISO 27001'),
    jsonb_build_object('id', 'trust-3', 'label', 'PDPL Compliant'),
    jsonb_build_object('id', 'trust-4', 'label', 'Sovereign Deployment')
  ),
  'valueProps', jsonb_build_array(
    jsonb_build_object('id', 'vp-1', 'title', 'AI-Native Platform', 'body', 'Built on Dogan-AI OS with agentic AI for automated risk detection and compliance workflows'),
    jsonb_build_object('id', 'vp-2', 'title', 'Regulatory Ready', 'body', 'Pre-configured for KSA/GCC regulations with automated compliance mapping and reporting'),
    jsonb_build_object('id', 'vp-3', 'title', 'Sovereign Deployment', 'body', 'Deploy on-premises or in sovereign cloud with full data residency control'),
    jsonb_build_object('id', 'vp-4', 'title', 'Enterprise Scale', 'body', 'Modular architecture scales from startup to enterprise with 72+ platform modules')
  ),
  'agentic', jsonb_build_object(
    'eyebrow', 'AI-Powered GRC',
    'title', 'Agentic Intelligence Platform',
    'readinessPercent', 85,
    'tiles', jsonb_build_array()
  ),
  'downloadKit', jsonb_build_object(
    'eyebrow', 'Resources',
    'title', 'Executive Kit',
    'body', 'Download comprehensive guides, whitepapers, and implementation resources',
    'ctaLabel', 'Download Kit',
    'featuredAssetKey', 'shahin-executive-kit',
    'loadingText', 'Preparing download...',
    'notification', jsonb_build_object('title', 'Download Started', 'subtitle', 'Your executive kit is being prepared'),
    'toast', jsonb_build_object('title', 'Download Complete', 'subtitle', 'Check your downloads folder')
  ),
  'platform', jsonb_build_object(
    'eyebrow', 'Platform',
    'title', 'Built on Dogan-AI OS',
    'body', 'Shahin-AI leverages the Dogan-AI OS modular operating system for governed products',
    'tabs', jsonb_build_array(
      jsonb_build_object('id', 'tab-1', 'label', 'Architecture', 'body', 'Modular microservices architecture with 72+ modules'),
      jsonb_build_object('id', 'tab-2', 'label', 'Security', 'body', 'Enterprise-grade security with DAuth identity and DSOC operations'),
      jsonb_build_object('id', 'tab-3', 'label', 'Scalability', 'body', 'PM2-managed ecosystem with 37 services and horizontal scaling')
    )
  ),
  'modules', jsonb_build_array(),
  'industries', jsonb_build_array(
    jsonb_build_object('id', 'ind-1', 'label', 'Financial Services'),
    jsonb_build_object('id', 'ind-2', 'label', 'Healthcare'),
    jsonb_build_object('id', 'ind-3', 'label', 'Government'),
    jsonb_build_object('id', 'ind-4', 'label', 'Energy')
  ),
  'architecture', jsonb_build_object(
    'title', 'Platform Architecture',
    'body', 'Modular operating system with 72+ modules and 37 services',
    'rows', jsonb_build_array()
  ),
  'ai', jsonb_build_object(
    'eyebrow', 'AI & Automation',
    'title', 'Agentic Intelligence',
    'body', 'AI-powered workflows with LangGraph and Langfuse integration',
    'currentStep', 3,
    'steps', jsonb_build_array()
  ),
  'pricing', jsonb_build_object(
    'eyebrow', 'Pricing',
    'title', 'Enterprise Plans',
    'ctaLabel', 'Contact Sales',
    'href', '/contact',
    'columns', jsonb_build_array(),
    'rows', jsonb_build_array()
  ),
  'testimonials', jsonb_build_object(
    'eyebrow', 'Testimonials',
    'title', 'Trusted by Leaders',
    'sub', 'See how enterprises use Shahin-AI for GRC',
    'items', jsonb_build_array()
  ),
  'logos', jsonb_build_object(
    'eyebrow', 'Trusted By',
    'title', 'Industry Leaders',
    'label', 'Organizations using Shahin-AI',
    'items', jsonb_build_array()
  ),
  'resources', jsonb_build_object(
    'eyebrow', 'Resources',
    'title', 'Knowledge Hub',
    'sub', 'Guides, whitepapers, and documentation',
    'label', 'Latest Resources',
    'items', jsonb_build_array()
  ),
  'faq', jsonb_build_object(
    'eyebrow', 'FAQ',
    'title', 'Common Questions',
    'sub', 'Answers to frequently asked questions',
    'items', jsonb_build_array()
  ),
  'ctaBanner', jsonb_build_object(
    'eyebrow', 'Ready to Get Started?',
    'title', 'Transform Your GRC Program',
    'sub', 'Contact us to schedule a demo'
  ),
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', 'Home', 'href', '/', 'current', true)
  )
)) ON CONFLICT (brand_code, locale) DO NOTHING;

COMMIT;
