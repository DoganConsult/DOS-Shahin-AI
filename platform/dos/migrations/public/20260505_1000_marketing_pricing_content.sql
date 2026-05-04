-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1000_marketing_pricing_content.sql
-- Purpose: Add advanced content props for pricing page
--
-- This migration adds comprehensive pricing content to the /pricing route,
-- including plans, features, pricing tables, and CTA information.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'Pricing',
  'eyebrow_ar', 'التسعير',
  'title_en', 'Pricing built for governance teams',
  'title_ar', 'تسعير مصمم لفرق الحوكمة',
  'sub_en', 'Choose the plan that fits your organization. Scale as you grow.',
  'sub_ar', 'اختر الخطة التي تناسب مؤسستك. قم بالتوسع مع نموك.',
  'ctaLabel_en', 'Get Started',
  'ctaLabel_ar', 'ابدأ الآن',
  'ctaHref', '/contact',
  'currency', 'SAR',
  'billingCycle_en', 'monthly',
  'billingCycle_ar', 'شهرياً',
  'plans', jsonb_build_array(
    jsonb_build_object(
      'id', 'starter',
      'name_en', 'Starter',
      'name_ar', 'البداية',
      'price', '2990',
      'period_en', 'per month',
      'period_ar', 'شهرياً',
      'description_en', 'Essential governance for small teams',
      'description_ar', 'حوكمة أساسية للفرق الصغيرة',
      'features', jsonb_build_array(
        jsonb_build_object('en', 'Up to 10 users', 'ar', 'حتى 10 مستخدمين', 'included', true),
        jsonb_build_object('en', 'Basic compliance framework', 'ar', 'إطار الامتثال الأساسي', 'included', true),
        jsonb_build_object('en', 'Standard reports', 'ar', 'التقارير القياسية', 'included', true),
        jsonb_build_object('en', 'Email support', 'ar', 'الدعم عبر البريد الإلكتروني', 'included', true),
        jsonb_build_object('en', 'AI assistant (limited)', 'ar', 'المساعد الذكي (محدود)', 'included', false)
      ),
      'popular', false
    ),
    jsonb_build_object(
      'id', 'professional',
      'name_en', 'Professional',
      'name_ar', 'المحترف',
      'price', '7990',
      'period_en', 'per month',
      'period_ar', 'شهرياً',
      'description_en', 'Advanced governance for growing organizations',
      'description_ar', 'حوكمة متقدمة للمؤسسات المتنامية',
      'features', jsonb_build_array(
        jsonb_build_object('en', 'Up to 50 users', 'ar', 'حتى 50 مستخدم', 'included', true),
        jsonb_build_object('en', 'Advanced compliance framework', 'ar', 'إطار الامتثال المتقدم', 'included', true),
        jsonb_build_object('en', 'Custom reports', 'ar', 'تقارير مخصصة', 'included', true),
        jsonb_build_object('en', 'Priority support', 'ar', 'دعم ذو أولوية', 'included', true),
        jsonb_build_object('en', 'AI assistant (full)', 'ar', 'المساعد الذكي (كامل)', 'included', true)
      ),
      'popular', true
    ),
    jsonb_build_object(
      'id', 'enterprise',
      'name_en', 'Enterprise',
      'name_ar', 'المؤسسة',
      'price', '19990',
      'period_en', 'per month',
      'period_ar', 'شهرياً',
      'description_en', 'Complete governance for large enterprises',
      'description_ar', 'حوكمة كاملة للمؤسسات الكبيرة',
      'features', jsonb_build_array(
        jsonb_build_object('en', 'Unlimited users', 'ar', 'مستخدمون غير محدودين', 'included', true),
        jsonb_build_object('en', 'Enterprise compliance framework', 'ar', 'إطار الامتثال للمؤسسات', 'included', true),
        jsonb_build_object('en', 'Custom integrations', 'ar', 'تكاملات مخصصة', 'included', true),
        jsonb_build_object('en', '24/7 dedicated support', 'ar', 'دعم مخصص على مدار الساعة', 'included', true),
        jsonb_build_object('en', 'AI assistant + custom training', 'ar', 'المساعد الذكي + تدريب مخصص', 'included', true)
      ),
      'popular', false
    )
  )
)
WHERE route = '/pricing' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For pricing: {brandCode, eyebrow, title, sub, ctaLabel, ctaHref, currency, billingCycle, plans}';
