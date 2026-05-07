-- 20260511_1210_foundation_access_review_campaign_contracts.sql
--
-- Wave 04: access-review campaign, SLA queue, and evidence timeline
-- contracts for /foundation/access-review.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_route_access_review_campaign (
  route             text NOT NULL,
  campaign_id       text NOT NULL,
  sort_order        integer NOT NULL DEFAULT 100,
  title_en          text NOT NULL,
  title_ar          text NOT NULL,
  status            text NOT NULL,
  sla_due_at        timestamptz,
  pending_items     integer NOT NULL DEFAULT 0,
  escalated_items   integer NOT NULL DEFAULT 0,
  completed_items   integer NOT NULL DEFAULT 0,
  decision_action   jsonb,
  PRIMARY KEY (route, campaign_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_route_access_review_evidence (
  route             text NOT NULL,
  evidence_id       text NOT NULL,
  sort_order        integer NOT NULL DEFAULT 100,
  occurred_at       timestamptz NOT NULL,
  title_en          text NOT NULL,
  title_ar          text NOT NULL,
  description_en    text,
  description_ar    text,
  actor             text,
  status            text,
  payload_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (route, evidence_id)
);

DELETE FROM dos.ui_route_access_review_campaign
 WHERE route = '/foundation/access-review';

INSERT INTO dos.ui_route_access_review_campaign (
  route, campaign_id, sort_order, title_en, title_ar, status, sla_due_at,
  pending_items, escalated_items, completed_items, decision_action
)
VALUES
  (
    '/foundation/access-review',
    'q2-2026-foundation',
    10,
    'Q2 2026 Foundation Access Review',
    'مراجعة صلاحيات الأساس للربع الثاني 2026',
    'active',
    now() + interval '36 hours',
    42,
    5,
    14,
    jsonb_build_object('kind','dispatch_event','eventName','foundation.access-review.open-campaign')
  ),
  (
    '/foundation/access-review',
    'q2-2026-privileged',
    20,
    'Q2 2026 Privileged Roles Review',
    'مراجعة الأدوار المميزة للربع الثاني 2026',
    'escalated',
    now() + interval '8 hours',
    17,
    9,
    21,
    jsonb_build_object('kind','dispatch_event','eventName','foundation.access-review.open-campaign')
  );

DELETE FROM dos.ui_route_access_review_evidence
 WHERE route = '/foundation/access-review';

INSERT INTO dos.ui_route_access_review_evidence (
  route, evidence_id, sort_order, occurred_at, title_en, title_ar,
  description_en, description_ar, actor, status, payload_json
)
VALUES
  (
    '/foundation/access-review',
    'evidence-001',
    10,
    now() - interval '2 hours',
    'Escalation raised for dormant privileged access',
    'تصعيد لصلاحية مميزة خاملة',
    'Dormant privileged assignment exceeded SLA and was escalated to IAM owner.',
    'تجاوزت صلاحية مميزة خاملة اتفاقية مستوى الخدمة وتم تصعيدها لمالك إدارة الهوية.',
    'iam.control@dos.local',
    'escalated',
    jsonb_build_object('campaignId','q2-2026-privileged','userCount',3)
  ),
  (
    '/foundation/access-review',
    'evidence-002',
    20,
    now() - interval '35 minutes',
    'Committee approval captured',
    'تم تسجيل موافقة اللجنة',
    'Delegation committee approved remediation package for high-risk role set.',
    'اعتمدت لجنة التفويض حزمة المعالجة لمجموعة أدوار عالية المخاطر.',
    'committee.secretary@dos.local',
    'approved',
    jsonb_build_object('campaignId','q2-2026-foundation','ticket','GRC-2184')
  );

DELETE FROM dos.ui_route_table_action
 WHERE route = '/foundation/access-review'
   AND action_id IN ('open-campaign','escalate-overdue','export-evidence');

INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
VALUES
  (
    '/foundation/access-review',
    'open-campaign',
    'row',
    10,
    'Open campaign',
    'فتح الحملة',
    jsonb_build_object('kind','dispatch_event','eventName','foundation.access-review.open-campaign'),
    NULL,
    'secondary'
  ),
  (
    '/foundation/access-review',
    'escalate-overdue',
    'batch',
    20,
    'Escalate overdue',
    'تصعيد المتأخر',
    jsonb_build_object('kind','dispatch_event','eventName','foundation.access-review.escalate-overdue'),
    NULL,
    'danger'
  ),
  (
    '/foundation/access-review',
    'export-evidence',
    'toolbar',
    30,
    'Export evidence',
    'تصدير الأدلة',
    jsonb_build_object('kind','dispatch_event','eventName','foundation.access-review.export-evidence'),
    NULL,
    'ghost'
  );

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
     COALESCE(props, '{}'::jsonb),
     '{eventHandlers}',
     COALESCE(props->'eventHandlers', '{}'::jsonb) || jsonb_build_object(
       'foundation.access-review.open-campaign', jsonb_build_object('method','redirect','url','/foundation/access-review'),
       'foundation.access-review.escalate-overdue', jsonb_build_object('method','redirect','url','/foundation/access-review/escalations'),
       'foundation.access-review.export-evidence', jsonb_build_object('method','redirect','url','/foundation/reports')
     ),
     true
   ),
   updated_at = now()
 WHERE route = '/foundation/access-review';

DO $$
DECLARE c_campaigns integer;
DECLARE c_evidence integer;
BEGIN
  SELECT COUNT(*) INTO c_campaigns
    FROM dos.ui_route_access_review_campaign
   WHERE route = '/foundation/access-review';
  IF c_campaigns < 2 THEN
    RAISE EXCEPTION 'access-review campaign assertion failed: expected >=2 campaigns, got %', c_campaigns;
  END IF;

  SELECT COUNT(*) INTO c_evidence
    FROM dos.ui_route_access_review_evidence
   WHERE route = '/foundation/access-review';
  IF c_evidence < 2 THEN
    RAISE EXCEPTION 'access-review evidence assertion failed: expected >=2 entries, got %', c_evidence;
  END IF;
END $$;

COMMIT;
