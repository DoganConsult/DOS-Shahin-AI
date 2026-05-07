-- 20260511_1100_wave09_ksa_localization_and_compliance_exports.sql
--
-- Wave 09: Arabic-first parity + bilingual compliance export seeds.
-- DB-owned localization only; no frontend fallback content.

BEGIN;

UPDATE dos.dynamic_ui_routes
   SET title_key = 'foundation.page.delegations.title',
       subtitle_key = 'foundation.page.delegations.subtitle'
 WHERE path_pattern = '/foundation/delegations'
   AND tenant_id IS NULL;

UPDATE dos.dynamic_ui_routes
   SET title_key = 'foundation.page.workflows.title',
       subtitle_key = 'foundation.page.workflows.subtitle'
 WHERE path_pattern = '/foundation/workflows'
   AND tenant_id IS NULL;

UPDATE dos.dynamic_ui_routes
   SET title_key = 'foundation.page.ownership-mapping.title',
       subtitle_key = 'foundation.page.ownership-mapping.subtitle'
 WHERE path_pattern = '/foundation/ownership-mapping'
   AND tenant_id IS NULL;

SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value)
VALUES
  ('foundation.page', 'foundation.page.delegations.title', 'en', 'Delegations'),
  ('foundation.page', 'foundation.page.delegations.subtitle', 'en', 'Authority assignments across delegator and delegate roles'),
  ('foundation.page', 'foundation.page.delegations.title', 'ar', 'التفويضات'),
  ('foundation.page', 'foundation.page.delegations.subtitle', 'ar', 'تعيينات الصلاحيات بين المفوض والمفوّض إليه'),

  ('foundation.page', 'foundation.page.workflows.title', 'en', 'Workflows'),
  ('foundation.page', 'foundation.page.workflows.subtitle', 'en', 'Foundation workflow definitions and execution status.'),
  ('foundation.page', 'foundation.page.workflows.title', 'ar', 'سير العمل'),
  ('foundation.page', 'foundation.page.workflows.subtitle', 'ar', 'تعريفات سير عمل المؤسسة وحالة التنفيذ.'),

  ('foundation.page', 'foundation.page.ownership-mapping.title', 'en', 'Ownership mapping'),
  ('foundation.page', 'foundation.page.ownership-mapping.subtitle', 'en', 'Map ownership across entities and modules.'),
  ('foundation.page', 'foundation.page.ownership-mapping.title', 'ar', 'خرائط الملكية'),
  ('foundation.page', 'foundation.page.ownership-mapping.subtitle', 'ar', 'تخطيط الملكية عبر الكيانات والوحدات.')
ON CONFLICT (key, locale) DO UPDATE
SET value = EXCLUDED.value,
    ns = EXCLUDED.ns,
    updated_at = NOW();

INSERT INTO dos.ui_route_export_artifact (
  route, sort_order, artifact_id, title_en, title_ar, format, status, size_kb, download_url, generated_at
)
VALUES
  ('/foundation/reports', 10, 'foundation-compliance-pack-q2', 'Foundation compliance pack (Q2)', 'حزمة امتثال المؤسسة (الربع الثاني)', 'pdf', 'ready', 5120, '/api/exports/foundation-compliance-pack-q2.pdf', '2026-05-10T10:00:00Z'::timestamptz),
  ('/foundation/reports', 20, 'foundation-evidence-ledger-q2', 'Foundation evidence ledger (Q2)', 'دفتر أدلة المؤسسة (الربع الثاني)', 'xlsx', 'ready', 2890, '/api/exports/foundation-evidence-ledger-q2.xlsx', '2026-05-10T10:05:00Z'::timestamptz),
  ('/foundation/reports', 30, 'foundation-arabic-board-brief', 'Foundation board brief (Arabic)', 'موجز مجلس الإدارة للمؤسسة (عربي)', 'pdf', 'ready', 1980, '/api/exports/foundation-board-brief-ar.pdf', '2026-05-10T10:07:00Z'::timestamptz)
ON CONFLICT (route, artifact_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  title_en = EXCLUDED.title_en,
  title_ar = EXCLUDED.title_ar,
  format = EXCLUDED.format,
  status = EXCLUDED.status,
  size_kb = EXCLUDED.size_kb,
  download_url = EXCLUDED.download_url,
  generated_at = EXCLUDED.generated_at;

DO $$
DECLARE
  c_i18n integer;
  c_exports integer;
BEGIN
  SELECT COUNT(*) INTO c_i18n
  FROM dos.workspace_shell_i18n
  WHERE key IN (
    'foundation.page.delegations.title',
    'foundation.page.delegations.subtitle',
    'foundation.page.workflows.title',
    'foundation.page.workflows.subtitle',
    'foundation.page.ownership-mapping.title',
    'foundation.page.ownership-mapping.subtitle'
  );

  IF c_i18n < 12 THEN
    RAISE EXCEPTION 'wave09 localization assertion failed: expected >=12 i18n rows, got %', c_i18n;
  END IF;

  SELECT COUNT(*) INTO c_exports
  FROM dos.ui_route_export_artifact
  WHERE route = '/foundation/reports'
    AND artifact_id IN (
      'foundation-compliance-pack-q2',
      'foundation-evidence-ledger-q2',
      'foundation-arabic-board-brief'
    );

  IF c_exports < 3 THEN
    RAISE EXCEPTION 'wave09 export assertion failed: expected 3 report export artifacts, got %', c_exports;
  END IF;
END $$;

COMMIT;
