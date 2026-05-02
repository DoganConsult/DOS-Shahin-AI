-- Foundation: Compliance Fabric (G7) — policy acknowledgments, mandatory
-- training assignments, conflict-of-interest declarations.
--
-- Pain killed:
--   "Did everyone read the new policy?" — unknowable today.
--   "Are all employees trained on PDPL?" — relies on HR's Excel.
--   "Who has a COI declared?" — never collected centrally.
--   Auditors rate compliance posture per person; today we cannot answer.
--
-- After this migration:
--   - Every employee can be required to ack policies; coverage % is queryable.
--   - Training assignments have due dates + completion + scores; overdue list
--     drives the A16 Compliance Companion agent.
--   - Annual COI declarations capture disclosures with renewal cadence.

-- ─── Policy acknowledgments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_policy_acknowledgments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  policy_id       TEXT NOT NULL,
  policy_version  TEXT NOT NULL,
  required        BOOLEAN NOT NULL DEFAULT true,
  due_at          TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  evidence_ref    TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_foundation_policy_ack
    UNIQUE NULLS NOT DISTINCT (tenant_id, user_id, policy_id, policy_version)
);

CREATE INDEX IF NOT EXISTS ix_foundation_policy_ack_user
  ON dos.foundation_policy_acknowledgments (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_foundation_policy_ack_overdue
  ON dos.foundation_policy_acknowledgments (tenant_id, due_at)
  WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_foundation_policy_ack_policy
  ON dos.foundation_policy_acknowledgments (tenant_id, policy_id, policy_version);

-- ─── Training assignments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_training_courses (
  course_code     TEXT NOT NULL,
  tenant_id       TEXT,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  description_ar  TEXT,
  category        TEXT,
  duration_minutes INT,
  provider        TEXT,
  is_mandatory    BOOLEAN NOT NULL DEFAULT false,
  renewal_months  INT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_foundation_training_courses
    UNIQUE NULLS NOT DISTINCT (tenant_id, course_code)
);

CREATE TABLE IF NOT EXISTS dos.foundation_training_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  course_code     TEXT NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by     TEXT,
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  score           NUMERIC(5, 2),
  pass_threshold  NUMERIC(5, 2),
  status          TEXT NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned','in_progress','completed','failed','overdue','exempted')),
  evidence_ref    TEXT,
  reason_assigned TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_foundation_training_assignments_user
  ON dos.foundation_training_assignments (tenant_id, user_id, status);
CREATE INDEX IF NOT EXISTS ix_foundation_training_assignments_due
  ON dos.foundation_training_assignments (tenant_id, due_at)
  WHERE status IN ('assigned','in_progress','overdue');
CREATE INDEX IF NOT EXISTS ix_foundation_training_assignments_course
  ON dos.foundation_training_assignments (tenant_id, course_code);

-- ─── Conflict of interest declarations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_coi_declarations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  declaration_period TEXT NOT NULL,            -- e.g. '2026', '2026-Q1'
  has_conflicts   BOOLEAN NOT NULL,
  disclosures     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{type, party, nature, since}]
  declared_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence_ref    TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,
  review_decision TEXT CHECK (review_decision IN ('cleared','mitigation_required','blocked')),
  review_note     TEXT,
  CONSTRAINT uq_foundation_coi_period
    UNIQUE NULLS NOT DISTINCT (tenant_id, user_id, declaration_period)
);

CREATE INDEX IF NOT EXISTS ix_foundation_coi_user
  ON dos.foundation_coi_declarations (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_foundation_coi_pending_review
  ON dos.foundation_coi_declarations (tenant_id, has_conflicts, review_decision)
  WHERE has_conflicts = true AND reviewed_at IS NULL;

-- ─── Seed canonical training courses (platform defaults) ────────────────────
INSERT INTO dos.foundation_training_courses
  (course_code, tenant_id, name_en, name_ar, description_en, description_ar,
   category, duration_minutes, is_mandatory, renewal_months)
VALUES
  ('pdpl_basics', NULL,
   'PDPL Foundations (Saudi)',
   'أساسيات حماية البيانات الشخصية',
   'Saudi Personal Data Protection Law principles and obligations.',
   'مبادئ والتزامات نظام حماية البيانات الشخصية السعودي.',
   'compliance', 60, true, 12),

  ('infosec_awareness', NULL,
   'Information Security Awareness',
   'الوعي بأمن المعلومات',
   'Phishing, password hygiene, data classification, incident reporting.',
   'التصيد، كلمات المرور، تصنيف البيانات، الإبلاغ عن الحوادث.',
   'security', 45, true, 12),

  ('coc_anti_bribery', NULL,
   'Code of Conduct & Anti-Bribery',
   'قواعد السلوك ومكافحة الرشوة',
   'Ethics standards, gifts policy, anti-bribery, whistleblowing channels.',
   'معايير الأخلاق، سياسة الهدايا، مكافحة الرشوة، قنوات الإبلاغ.',
   'ethics', 30, true, 12),

  ('aml_kyc', NULL,
   'AML / KYC Fundamentals',
   'أساسيات مكافحة غسل الأموال',
   'Anti-money-laundering, know-your-customer, transaction monitoring.',
   'مكافحة غسل الأموال، اعرف عميلك، مراقبة المعاملات.',
   'compliance', 60, false, 12),

  ('sama_csf_intro', NULL,
   'SAMA Cybersecurity Framework Intro',
   'مقدمة في إطار الأمن السيبراني (ساما)',
   'Overview of SAMA CSF for FSI employees.',
   'نظرة عامة على إطار الأمن السيبراني للقطاع المالي.',
   'compliance', 45, false, 24),

  ('sod_basics', NULL,
   'Segregation of Duties Awareness',
   'الوعي بالفصل بين المهام',
   'How SoD violations occur and how to escalate concerns.',
   'كيف تحدث انتهاكات الفصل بين المهام وكيفية تصعيدها.',
   'compliance', 30, false, 12)
ON CONFLICT (tenant_id, course_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar,
  category = EXCLUDED.category, duration_minutes = EXCLUDED.duration_minutes,
  is_mandatory = EXCLUDED.is_mandatory, renewal_months = EXCLUDED.renewal_months,
  is_active = true;
