-- 521_visitor_lead_dedup_and_sales_nav.sql
-- Visitor + Tenant completeness pass (2026-04-28).
--
-- 1. Index for the dedup lookup in captureA13Lead (email + captured_at).
-- 2. Nav seed for the Sales Copilot Leads page.

CREATE INDEX IF NOT EXISTS idx_copilot_leads_email_recent
  ON public.copilot_leads (email, captured_at DESC)
  WHERE email IS NOT NULL;

INSERT INTO public.default_navigation_items
  (nav_key, parent_key, label_en, label_ar, route, icon, module_code, nav_type, sort_order, is_active)
VALUES
  ('sales_root',           NULL,         'Sales',            'المبيعات',                          NULL,                                'pi-briefcase', 'sales', 'group', 175, TRUE),
  ('sales_copilot_leads',  'sales_root', 'Copilot Leads',    'العملاء المحتملون من المساعد',       '/workspace/sales/copilot-leads',    'pi-users',     'sales', 'link',  10,  TRUE)
ON CONFLICT (nav_key) DO UPDATE SET
  parent_key = EXCLUDED.parent_key,
  label_en   = EXCLUDED.label_en,
  label_ar   = EXCLUDED.label_ar,
  route      = EXCLUDED.route,
  icon       = EXCLUDED.icon,
  module_code = EXCLUDED.module_code,
  nav_type   = EXCLUDED.nav_type,
  sort_order = EXCLUDED.sort_order,
  is_active  = EXCLUDED.is_active;
