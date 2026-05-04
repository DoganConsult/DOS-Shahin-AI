-- DOS MASTER PLAN — M12 D1.
--
-- Admin pillar composer-driven tables. Backs the 4 admin pillar UIs
-- (DNOC/DSOC/DOS/DAuth) with row-driven page/widget composition.
-- All writes pass through trg_dos_master_only and require
-- dos.actor='dos-master'. Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- ① Pillar registry.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.admin_pillar (
  pillar_code   text PRIMARY KEY,
  display_name  text NOT NULL,
  description   text,
  enabled       boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  CHECK (pillar_code IN ('DNOC','DSOC','DOS','DAuth'))
);

INSERT INTO dos.admin_pillar (pillar_code, display_name, description, display_order) VALUES
  ('DNOC','DOS Network Operations Center','Service health, throughput, capacity, fleet ops.',1),
  ('DSOC','DOS Security Operations Center','Threat, intrusion, audit, anomaly, response.',2),
  ('DOS','DOS Operating System','Platform DNA: registry, lifecycle, doctrine, PPD.',3),
  ('DAuth','DOS Authority','Identity, session, MFA, SoD, authority, access store.',4)
ON CONFLICT (pillar_code) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  description=EXCLUDED.description,
  display_order=EXCLUDED.display_order;

-- =====================================================================
-- ② Pillar pages (composer-driven, archetype-bound).
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.admin_pillar_page (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_code   text NOT NULL REFERENCES dos.admin_pillar(pillar_code) ON DELETE CASCADE,
  page_key      text NOT NULL,
  display_name  text NOT NULL,
  archetype     text NOT NULL,
  route         text NOT NULL,
  permission_required text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  enabled       boolean NOT NULL DEFAULT true,
  UNIQUE (pillar_code, page_key)
);
CREATE INDEX IF NOT EXISTS ix_admin_pillar_page_route ON dos.admin_pillar_page (route);

-- =====================================================================
-- ③ Pillar widgets (per-page composer).
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.admin_pillar_widget (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       uuid NOT NULL REFERENCES dos.admin_pillar_page(id) ON DELETE CASCADE,
  widget_key    text NOT NULL,
  carbon_key    text NOT NULL,
  title_en      text,
  title_ar      text,
  data_source   text NOT NULL,
  props         jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  permission_required text,
  UNIQUE (page_id, widget_key)
);

-- =====================================================================
-- ④ Attach trg_dos_master_only to all 3 controlled tables.
-- =====================================================================
DROP TRIGGER IF EXISTS trg_dos_master_only_admin_pillar        ON dos.admin_pillar;
DROP TRIGGER IF EXISTS trg_dos_master_only_admin_pillar_page   ON dos.admin_pillar_page;
DROP TRIGGER IF EXISTS trg_dos_master_only_admin_pillar_widget ON dos.admin_pillar_widget;

CREATE TRIGGER trg_dos_master_only_admin_pillar
  BEFORE INSERT OR UPDATE OR DELETE ON dos.admin_pillar
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only();

CREATE TRIGGER trg_dos_master_only_admin_pillar_page
  BEFORE INSERT OR UPDATE OR DELETE ON dos.admin_pillar_page
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only();

CREATE TRIGGER trg_dos_master_only_admin_pillar_widget
  BEFORE INSERT OR UPDATE OR DELETE ON dos.admin_pillar_widget
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only();

-- =====================================================================
-- ⑤ Seed canonical pages — 1 per pillar.
-- =====================================================================
DO $seed$
DECLARE
  v_dnoc uuid; v_dsoc uuid; v_dos uuid; v_dauth uuid;
BEGIN
  PERFORM set_config('dos.actor','dos-master',true);

  INSERT INTO dos.admin_pillar_page
    (pillar_code, page_key, display_name, archetype, route, permission_required, display_order)
  VALUES
    ('DNOC','overview','DNOC Overview','dashboard-grid','/admin/dnoc/overview','pillar.dnoc.access',1),
    ('DSOC','overview','DSOC Overview','dashboard-grid','/admin/dsoc/overview','pillar.dsoc.access',1),
    ('DOS','overview','DOS Overview','dashboard-grid','/admin/dos/overview','pillar.dos.access',1),
    ('DAuth','overview','DAuth Overview','dashboard-grid','/admin/dauth/overview','pillar.dauth.access',1)
  ON CONFLICT (pillar_code, page_key) DO UPDATE SET
    display_name=EXCLUDED.display_name,
    archetype=EXCLUDED.archetype,
    route=EXCLUDED.route,
    permission_required=EXCLUDED.permission_required;

  SELECT id INTO v_dnoc  FROM dos.admin_pillar_page WHERE pillar_code='DNOC'  AND page_key='overview';
  SELECT id INTO v_dsoc  FROM dos.admin_pillar_page WHERE pillar_code='DSOC'  AND page_key='overview';
  SELECT id INTO v_dos   FROM dos.admin_pillar_page WHERE pillar_code='DOS'   AND page_key='overview';
  SELECT id INTO v_dauth FROM dos.admin_pillar_page WHERE pillar_code='DAuth' AND page_key='overview';

  INSERT INTO dos.admin_pillar_widget
    (page_id, widget_key, carbon_key, title_en, title_ar, data_source, props, display_order)
  VALUES
    (v_dnoc,  'fleet-health',  'metric-card', 'Fleet Health',         'صحة الأسطول',        'prom:up{job=~"dos-.*"}',                '{"unit":"%"}', 1),
    (v_dnoc,  'service-list',  'data-table',  'Service Registry',     'سجل الخدمات',        'pg:dos_master.service_registry',         '{"page_size":50}', 2),
    (v_dsoc,  'audit-stream',  'data-table',  'Audit Decision Ledger','سجل قرارات التدقيق', 'pg:dos.dos_master_writer_audit',         '{"page_size":50}', 1),
    (v_dsoc,  'anomaly-feed',  'tile',        'Anomalies (24h)',      'حالات شاذة (24س)',   'loki:{job="audit"} |= "deny"',           '{}', 2),
    (v_dos,   'doctrine',      'data-table',  'Doctrine Articles',    'مواد العقيدة',        'pg:dos_master.doctrine_article',         '{}', 1),
    (v_dos,   'rollout-rings', 'tile',        'Active Rollouts',      'إطلاقات نشطة',        'pg:dos.rollout_plan',                    '{}', 2),
    (v_dauth, 'admin-users',   'data-table',  'Platform Admin Users', 'مدراء المنصة',        'pg:platform_admin.platform_admin_user',  '{"page_size":50}', 1),
    (v_dauth, 'admin-grants',  'tile',        'Active Grants',        'الصلاحيات النشطة',     'pg:platform_admin.platform_admin_grant', '{}', 2)
  ON CONFLICT (page_id, widget_key) DO UPDATE SET
    carbon_key=EXCLUDED.carbon_key,
    title_en=EXCLUDED.title_en,
    title_ar=EXCLUDED.title_ar,
    data_source=EXCLUDED.data_source,
    props=EXCLUDED.props,
    display_order=EXCLUDED.display_order;
END
$seed$;

COMMIT;
