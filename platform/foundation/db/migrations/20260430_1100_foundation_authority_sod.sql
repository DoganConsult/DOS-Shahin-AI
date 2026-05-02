-- Foundation: Authority Matrix + SoD enforcement (G2 — Govern jobs).
--
-- Pain killed:
--   "Who can approve this contract?" answered by tribal knowledge today.
--   Toxic role combinations (e.g. payment_initiator + payment_approver on the
--   same user) get assigned without warning. SAMA / SOX-equivalent audits flag
--   missing DoA documentation as a top finding.
--
-- After this migration:
--   1. Every position has an explicit Authority Matrix (what kinds of decisions
--      it can approve, up to what monetary limit, with what qualifications).
--   2. Every role-assignment (and delegation grant, and committee membership)
--      can be checked against SoD rules BEFORE write — enforcing or warning
--      based on rule severity.
--   3. Open SoD violations are tracked with resolution states for periodic
--      remediation campaigns and auditor evidence.
--
-- All tables live in `dos.*` with TEXT tenant_id (matching foundation pattern).

-- ─── Authority Matrix ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_authority_kinds (
  authority_kind TEXT PRIMARY KEY,
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  description_en TEXT,
  description_ar TEXT,
  is_monetary    BOOLEAN NOT NULL DEFAULT false,
  default_unit   TEXT,                       -- e.g. 'SAR','USD','count'
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dos.foundation_authority_kinds (authority_kind, name_en, name_ar, description_en, is_monetary, default_unit) VALUES
  ('approve_payment',     'Approve payment',           'الموافقة على الدفع',       'Authorize a financial disbursement',                  true,  'SAR'),
  ('approve_contract',    'Approve contract',          'الموافقة على العقد',        'Sign a binding contract on behalf of the org',         true,  'SAR'),
  ('approve_policy',      'Approve policy',            'الموافقة على السياسة',      'Sign off on a policy document',                       false, NULL),
  ('grant_access',        'Grant access',              'منح الصلاحية',              'Approve a permission/role grant to a user',           false, NULL),
  ('approve_hire',        'Approve hire',              'الموافقة على التوظيف',      'Approve a new employee hire',                         false, NULL),
  ('approve_termination', 'Approve termination',       'الموافقة على إنهاء الخدمة', 'Approve an employee termination',                     false, NULL),
  ('approve_promotion',   'Approve promotion',         'الموافقة على الترقية',      'Approve a position uplift',                           true,  'SAR'),
  ('approve_delegation',  'Approve delegation',        'الموافقة على التفويض',      'Approve a temporary authority delegation',            false, NULL),
  ('approve_exception',   'Approve risk exception',    'الموافقة على استثناء المخاطر','Authorize a deviation from policy/control',         false, NULL),
  ('approve_data_access', 'Approve data access',       'الموافقة على وصول البيانات','Approve access to restricted/sensitive data',         false, NULL)
ON CONFLICT (authority_kind) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, is_monetary = EXCLUDED.is_monetary,
  is_active = true;

CREATE TABLE IF NOT EXISTS dos.foundation_position_authority (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  position_id     TEXT NOT NULL,
  authority_kind  TEXT NOT NULL REFERENCES dos.foundation_authority_kinds(authority_kind),
  monetary_limit  NUMERIC(18, 2),                  -- nullable for non-monetary
  monetary_unit   TEXT,
  qualifications  TEXT[],                          -- skill codes required
  conditions      JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from  DATE,
  effective_to    DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT,
  CONSTRAINT uq_foundation_position_authority
    UNIQUE NULLS NOT DISTINCT (tenant_id, position_id, authority_kind, effective_from)
);

CREATE INDEX IF NOT EXISTS ix_foundation_position_authority
  ON dos.foundation_position_authority (tenant_id, position_id);
CREATE INDEX IF NOT EXISTS ix_foundation_position_authority_kind
  ON dos.foundation_position_authority (tenant_id, authority_kind);

-- ─── SoD rules ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_sod_rules (
  rule_code      TEXT NOT NULL,
  tenant_id      TEXT,                              -- NULL = platform default
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  description_en TEXT,
  description_ar TEXT,
  rule_kind      TEXT NOT NULL CHECK (rule_kind IN (
                   'mutually_exclusive_roles',
                   'blocked_role_pair',
                   'blocked_authority_pair',
                   'time_separation',
                   'approval_self_block',
                   'committee_self_block')),
  parameters     JSONB NOT NULL,
  severity       TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  is_enforcing   BOOLEAN NOT NULL DEFAULT true,    -- false = warn-only
  remediation_hint_en TEXT,
  remediation_hint_ar TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     TEXT,
  CONSTRAINT uq_foundation_sod_rules
    UNIQUE NULLS NOT DISTINCT (tenant_id, rule_code)
);

CREATE INDEX IF NOT EXISTS ix_foundation_sod_rules_active
  ON dos.foundation_sod_rules (tenant_id, is_active) WHERE is_active = true;

-- ─── SoD violations (open + resolved log) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_sod_violations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  rule_code      TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  detected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  context        JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity       TEXT,
  resolution     TEXT NOT NULL DEFAULT 'open'
                   CHECK (resolution IN ('open','accepted_risk','remediated','false_positive','expired')),
  resolution_note TEXT,
  resolved_at    TIMESTAMPTZ,
  resolved_by    TEXT
);

CREATE INDEX IF NOT EXISTS ix_foundation_sod_violations_open
  ON dos.foundation_sod_violations (tenant_id, resolution, severity)
  WHERE resolution = 'open';

CREATE INDEX IF NOT EXISTS ix_foundation_sod_violations_user
  ON dos.foundation_sod_violations (tenant_id, user_id);

-- ─── Seed canonical SoD rules (platform defaults; tenant_id NULL) ───────────
-- These cover the most-cited GRC/SAMA/SOX patterns. Tenants override via
-- their own rule_code with non-null tenant_id.
INSERT INTO dos.foundation_sod_rules
  (rule_code, tenant_id, name_en, name_ar, description_en, description_ar,
   rule_kind, parameters, severity, is_enforcing,
   remediation_hint_en, remediation_hint_ar)
VALUES
  ('payment_initiator_vs_approver', NULL,
   'Payment initiator must not be payment approver',
   'منشئ الدفعة يجب ألا يوافق عليها',
   'A user holding a payment-initiator role cannot also hold a payment-approver role on the same tenant.',
   'لا يجوز للمستخدم الذي يحمل دور منشئ الدفع أن يحمل أيضًا دور الموافقة على الدفع.',
   'mutually_exclusive_roles',
   '{"role_pair":["payment_initiator","payment_approver"]}'::jsonb,
   'critical', true,
   'Reassign one of the two roles to another user; if business-required, file a documented compensating control.',
   'أعد تعيين أحد الدورين إلى مستخدم آخر؛ إذا اقتضى العمل ذلك، سجل ضابطًا تعويضيًا موثقًا.'),

  ('vendor_setup_vs_payment', NULL,
   'Vendor setup must not also approve payments',
   'إنشاء المورد يجب ألا يوافق على الدفعات',
   'Creating a vendor and approving payments to that vendor must be done by different users.',
   'يجب أن يقوم بإنشاء المورد والموافقة على الدفعات له مستخدمان مختلفان.',
   'blocked_role_pair',
   '{"role_pair":["vendor_admin","payment_approver"]}'::jsonb,
   'high', true,
   'Split vendor administration from payment approval; route through the foundation roles page.',
   'افصل إدارة الموردين عن الموافقة على المدفوعات؛ وجِّه ذلك عبر صفحة أدوار المؤسسة.'),

  ('user_admin_vs_audit', NULL,
   'User administrators cannot also be auditors',
   'مدير المستخدمين لا يكون مدققًا',
   'A user who can grant access cannot also audit access — separation required for ISO 27001 + SAMA.',
   'لا يجوز للمستخدم الذي يمنح الصلاحيات أن يدققها أيضًا.',
   'blocked_role_pair',
   '{"role_pair":["foundation_admin","auditor"]}'::jsonb,
   'critical', true,
   'Move audit role to an independent user; consider a compensating "read-only auditor" view.',
   'انقل دور التدقيق إلى مستخدم مستقل؛ فكِّر في منح "مدقق للقراءة فقط".'),

  ('approver_self_approval', NULL,
   'Approvers cannot self-approve their own requests',
   'مقدم الطلب لا يوافق على طلبه',
   'The approver of a workflow step cannot be the same user who initiated the request.',
   'لا يجوز للموافق في خطوة الإجراء أن يكون هو من بدأ الطلب.',
   'approval_self_block',
   '{"applies_to":["approve_payment","approve_contract","approve_policy","approve_promotion","approve_termination","approve_hire"]}'::jsonb,
   'critical', true,
   'Route approval to the next-level approver per the authority matrix.',
   'حوِّل الموافقة إلى المستوى الأعلى وفق مصفوفة الصلاحيات.'),

  ('committee_self_block', NULL,
   'Committee members cannot vote on items they sponsored',
   'أعضاء اللجنة لا يصوتون على البنود التي اقترحوها',
   'A committee member who proposed an agenda item cannot also vote on it.',
   'عضو اللجنة الذي اقترح بندًا في جدول الأعمال لا يجوز له التصويت عليه.',
   'committee_self_block',
   '{"applies_to":["all"]}'::jsonb,
   'high', true,
   'Recuse the proposing member; record the recusal in meeting minutes.',
   'استبعد العضو المقترح؛ ووثِّق ذلك في محضر الاجتماع.'),

  ('approver_quiet_period', NULL,
   'Approvers must wait 24h after their delegation grant',
   'يجب على الموافق الانتظار 24 ساعة بعد منح التفويض',
   'A user freshly granted approval authority should wait 24 hours before exercising it (anti-collusion).',
   'يجب على المستخدم الذي حصل على صلاحية الموافقة الانتظار 24 ساعة قبل استخدامها (لمنع التواطؤ).',
   'time_separation',
   '{"min_hours":24,"applies_to":["approve_payment","approve_contract"]}'::jsonb,
   'medium', false,
   'Defer the approval; if urgent, escalate to the next authority level.',
   'أجِّل الموافقة؛ وإذا كانت عاجلة، صعِّدها إلى المستوى التالي.')
ON CONFLICT (tenant_id, rule_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar,
  rule_kind = EXCLUDED.rule_kind, parameters = EXCLUDED.parameters,
  severity = EXCLUDED.severity, is_enforcing = EXCLUDED.is_enforcing,
  remediation_hint_en = EXCLUDED.remediation_hint_en,
  remediation_hint_ar = EXCLUDED.remediation_hint_ar,
  is_active = true;
