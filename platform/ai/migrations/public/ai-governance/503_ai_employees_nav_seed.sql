-- 503_ai_employees_nav_seed.sql
-- Phase 1 audit fix: seed navigation entries so the AI-OS pages are
-- discoverable from the sidebar (not just by typing the URL).
--
-- Adds a top-level "AI Operations" parent and three child links:
--   • AI Employees       → /workspace/hr/ai-employees     (Phase 1)
--   • AI Operations      → /workspace/dnoc/ai-ops         (Wave 5.D)
--   • AI Security        → /workspace/dsoc/ai-security    (Wave 5.D)
--   • AI Trace Surfaces  → /workspace/dnoc/ai-trace-surfaces (Wave 7)
--
-- Idempotent via ON CONFLICT (nav_key).

INSERT INTO public.default_navigation_items
  (nav_key, parent_key, label_en, label_ar, route, icon, module_code, nav_type, sort_order, is_active)
VALUES
  ('ai_ops_root',          NULL,           'AI Operations',          'عمليات الذكاء الاصطناعي', NULL,                                     'pi-android',         'ai',        'group', 180, TRUE),
  ('ai_employees',         'ai_ops_root',  'AI Employees',            'الموظفون الذكيون',          '/workspace/hr/ai-employees',             'pi-users',           'ai',        'link',  10,  TRUE),
  ('ai_ops_dashboard',     'ai_ops_root',  'AI Operations Dashboard', 'لوحة عمليات الذكاء',          '/workspace/dnoc/ai-ops',                 'pi-chart-line',      'ai',        'link',  20,  TRUE),
  ('ai_security_dashboard','ai_ops_root',  'AI Security Dashboard',   'لوحة أمن الذكاء',             '/workspace/dsoc/ai-security',            'pi-shield',          'ai',        'link',  30,  TRUE),
  ('ai_trace_surfaces',    'ai_ops_root',  'AI Trace Surfaces',       'أسطح تتبع الذكاء',            '/workspace/dnoc/ai-trace-surfaces',      'pi-search',          'ai',        'link',  40,  TRUE)
ON CONFLICT (nav_key) DO UPDATE SET
  parent_key  = EXCLUDED.parent_key,
  label_en    = EXCLUDED.label_en,
  label_ar    = EXCLUDED.label_ar,
  route       = EXCLUDED.route,
  icon        = EXCLUDED.icon,
  module_code = EXCLUDED.module_code,
  nav_type    = EXCLUDED.nav_type,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;
