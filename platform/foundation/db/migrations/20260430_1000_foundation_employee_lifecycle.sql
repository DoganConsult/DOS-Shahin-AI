-- Foundation: Employee lifecycle state machine (G1 — Govern jobs).
--
-- Pain killed:
--   HR runs onboarding/offboarding via spreadsheets and email; access leaks
--   on exit; no probation tracking; no audit-defensible state history.
--
-- After this migration:
--   Every employee has a single auditable state, every transition is
--   logged with actor + evidence + workflow refs, and 6 workflow templates
--   are available (onboarding, offboarding, transfer, promotion,
--   termination, probation_review).
--
-- Tables live in `dos` schema with tenant_id column (foundation pattern).

CREATE TABLE IF NOT EXISTS dos.foundation_employee_lifecycle_state (
  user_id        TEXT NOT NULL,
  tenant_id      TEXT NOT NULL,
  state          TEXT NOT NULL CHECK (state IN (
                   'candidate','hired','onboarding','active','probation',
                   'confirmed','on_leave','under_review','pip',
                   'transfer_pending','promoted','exiting','alumni')),
  state_since    TIMESTAMPTZ NOT NULL DEFAULT now(),
  state_due_by   TIMESTAMPTZ,
  state_owner    TEXT,
  state_meta     JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_id    UUID,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_state_due
  ON dos.foundation_employee_lifecycle_state (tenant_id, state, state_due_by)
  WHERE state_due_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_state_state
  ON dos.foundation_employee_lifecycle_state (tenant_id, state);

-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.foundation_employee_lifecycle_transitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  from_state     TEXT,
  to_state       TEXT NOT NULL,
  workflow_code  TEXT,
  workflow_id    UUID,
  approved_by    TEXT[],
  evidence_refs  TEXT[],
  reason         TEXT,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       TEXT NOT NULL,
  meta           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_transitions_user
  ON dos.foundation_employee_lifecycle_transitions (tenant_id, user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_transitions_workflow
  ON dos.foundation_employee_lifecycle_transitions (tenant_id, workflow_id)
  WHERE workflow_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Workflow templates — platform-scoped (tenant_id NULL). Tenants may insert
-- their own overrides with non-null tenant_id.
-- workflow templates: tenant_id NULL = platform default; one row per
-- (tenant_id, workflow_code). Use NULLS NOT DISTINCT so tenant overrides
-- conflict cleanly with the platform default during upserts.
CREATE TABLE IF NOT EXISTS dos.foundation_employee_lifecycle_workflows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code  TEXT NOT NULL,
  tenant_id      TEXT,
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  description_en TEXT,
  description_ar TEXT,
  trigger_state  TEXT NOT NULL,
  steps          JSONB NOT NULL,
  sla_hours      INT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_foundation_lifecycle_workflows
    UNIQUE NULLS NOT DISTINCT (tenant_id, workflow_code)
);

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_workflows_active
  ON dos.foundation_employee_lifecycle_workflows (workflow_code)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- Onboarding/offboarding task instances — concrete checklist items per
-- employee, generated when the workflow starts.
CREATE TABLE IF NOT EXISTS dos.foundation_employee_lifecycle_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  workflow_code  TEXT NOT NULL,
  workflow_id    UUID,
  step_code      TEXT NOT NULL,
  title_en       TEXT NOT NULL,
  title_ar       TEXT,
  assigned_to    TEXT,
  due_at         TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  completed_by   TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','blocked','done','skipped')),
  blocked_reason TEXT,
  evidence_refs  TEXT[],
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_tasks_user
  ON dos.foundation_employee_lifecycle_tasks (tenant_id, user_id, status);

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_tasks_assigned
  ON dos.foundation_employee_lifecycle_tasks (tenant_id, assigned_to, status)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_foundation_lifecycle_tasks_due
  ON dos.foundation_employee_lifecycle_tasks (tenant_id, due_at)
  WHERE status IN ('open','in_progress','blocked');

-- ---------------------------------------------------------------------------
-- Seed the 6 canonical workflow templates (tenant_id NULL = platform default).
INSERT INTO dos.foundation_employee_lifecycle_workflows
  (workflow_code, tenant_id, name_en, name_ar, description_en, description_ar,
   trigger_state, steps, sla_hours)
VALUES
  ('onboarding', NULL,
   'New Hire Onboarding', 'تأهيل الموظف الجديد',
   'Day-0 to Day-30 ramp: account, access, training, equipment, intros, first-week feedback.',
   'من اليوم الصفر حتى اليوم الثلاثين: الحساب، الصلاحيات، التدريب، التجهيزات، التعريف، تغذية راجعة الأسبوع الأول.',
   'hired',
   '[
      {"step_code":"create_account",         "title_en":"Create identity account",       "title_ar":"إنشاء حساب الهوية",          "owner_role":"foundation_admin", "sla_hours":4,   "evidence":false},
      {"step_code":"assign_base_role",       "title_en":"Assign base role + permissions", "title_ar":"إسناد الدور الأساسي والصلاحيات", "owner_role":"foundation_admin", "sla_hours":8,  "evidence":true},
      {"step_code":"request_equipment",      "title_en":"Order laptop + access badges",   "title_ar":"طلب الجهاز وبطاقات الدخول",  "owner_role":"hr_manager",       "sla_hours":48, "evidence":true},
      {"step_code":"acknowledge_policies",   "title_en":"Sign acceptable-use + COC",     "title_ar":"الموافقة على سياسات الاستخدام المقبول والسلوك", "owner_role":"hr_manager", "sla_hours":24, "evidence":true},
      {"step_code":"assign_training",        "title_en":"Schedule mandatory training",    "title_ar":"جدولة التدريب الإلزامي",     "owner_role":"hr_manager",       "sla_hours":24, "evidence":true},
      {"step_code":"manager_intro",          "title_en":"Manager 1:1 + team intros",      "title_ar":"اجتماع المدير والتعريف بالفريق", "owner_role":"line_manager", "sla_hours":48, "evidence":false},
      {"step_code":"first_week_feedback",    "title_en":"Day-7 check-in",                 "title_ar":"اللقاء بعد أسبوع",           "owner_role":"line_manager",     "sla_hours":168,"evidence":true},
      {"step_code":"start_probation_clock",  "title_en":"Start 90-day probation",         "title_ar":"بدء فترة التجربة 90 يوماً",  "owner_role":"hr_manager",       "sla_hours":720,"evidence":false}
    ]'::jsonb,
   720),

  ('offboarding', NULL,
   'Employee Exit', 'إنهاء خدمة الموظف',
   'Revoke access, recover assets, knowledge transfer, final-check exit interview, regulator-defensible audit pack.',
   'إلغاء الصلاحيات، استرداد الأصول، نقل المعرفة، مقابلة الخروج، حزمة تدقيق دفاعية.',
   'exiting',
   '[
      {"step_code":"freeze_writes",          "title_en":"Freeze write permissions",       "title_ar":"تجميد صلاحيات الكتابة",     "owner_role":"foundation_admin", "sla_hours":1,  "evidence":true},
      {"step_code":"knowledge_transfer",     "title_en":"Document handover + KT sessions","title_ar":"التوثيق ونقل المعرفة",       "owner_role":"line_manager",     "sla_hours":120,"evidence":true},
      {"step_code":"recover_equipment",      "title_en":"Recover laptop + badges + tokens","title_ar":"استرداد الجهاز والبطاقات والرموز","owner_role":"hr_manager",   "sla_hours":24, "evidence":true},
      {"step_code":"revoke_access",          "title_en":"Revoke all role + delegation grants","title_ar":"إلغاء جميع الأدوار والتفويضات","owner_role":"foundation_admin","sla_hours":1,"evidence":true},
      {"step_code":"reassign_owned_records", "title_en":"Reassign owned risks/policies/controls","title_ar":"إعادة تعيين المخاطر والسياسات والضوابط المملوكة","owner_role":"line_manager","sla_hours":48,"evidence":true},
      {"step_code":"exit_interview",         "title_en":"Exit interview + survey",        "title_ar":"مقابلة الخروج والاستبيان",   "owner_role":"hr_manager",       "sla_hours":48, "evidence":true},
      {"step_code":"final_payroll",          "title_en":"Final settlement + payroll",     "title_ar":"التسوية النهائية والرواتب",  "owner_role":"hr_manager",       "sla_hours":120,"evidence":true},
      {"step_code":"archive_record",         "title_en":"Archive to alumni state",        "title_ar":"الأرشفة في حالة الخريجين",   "owner_role":"foundation_admin", "sla_hours":4,  "evidence":false}
    ]'::jsonb,
   168),

  ('transfer', NULL,
   'Internal Transfer', 'النقل الداخلي',
   'Manager handoff, access delta, training delta, no break in employment.',
   'تسليم المدير، فروقات الصلاحيات، فروقات التدريب، دون انقطاع في الخدمة.',
   'transfer_pending',
   '[
      {"step_code":"current_manager_signoff","title_en":"Current manager sign-off",       "title_ar":"موافقة المدير الحالي",       "owner_role":"line_manager",     "sla_hours":48, "evidence":true},
      {"step_code":"new_manager_accept",     "title_en":"Receiving manager accept",       "title_ar":"قبول المدير المستلم",        "owner_role":"line_manager",     "sla_hours":48, "evidence":true},
      {"step_code":"access_delta",           "title_en":"Compute role/access delta",      "title_ar":"حساب فروقات الدور والصلاحية","owner_role":"foundation_admin", "sla_hours":24, "evidence":true},
      {"step_code":"training_delta",         "title_en":"Assign delta training",          "title_ar":"إسناد التدريب الفارق",       "owner_role":"hr_manager",       "sla_hours":24, "evidence":true},
      {"step_code":"sod_recheck",            "title_en":"Re-run SoD check on new role",   "title_ar":"إعادة فحص الفصل بين المهام","owner_role":"foundation_admin","sla_hours":1, "evidence":true},
      {"step_code":"effective_date",         "title_en":"Apply on effective date",        "title_ar":"التطبيق في تاريخ السريان",   "owner_role":"foundation_admin", "sla_hours":1,  "evidence":false}
    ]'::jsonb,
   240),

  ('promotion', NULL,
   'Promotion', 'الترقية',
   'Approval chain by authority matrix, pay change, comm, role uplift, SoD recheck.',
   'سلسلة الموافقات وفق مصفوفة الصلاحيات، تعديل الراتب، التواصل، رفع الدور، إعادة فحص الفصل.',
   'under_review',
   '[
      {"step_code":"manager_nominate",       "title_en":"Manager nomination",             "title_ar":"ترشيح المدير",               "owner_role":"line_manager",     "sla_hours":24, "evidence":true},
      {"step_code":"performance_evidence",   "title_en":"Attach 12-month performance",    "title_ar":"إرفاق أداء 12 شهراً",        "owner_role":"hr_manager",       "sla_hours":48, "evidence":true},
      {"step_code":"hr_review",              "title_en":"HR + comp review",               "title_ar":"مراجعة الموارد البشرية والتعويضات","owner_role":"hr_manager","sla_hours":72,"evidence":true},
      {"step_code":"authority_approval",     "title_en":"Approver per authority matrix",  "title_ar":"الموافقة وفق مصفوفة الصلاحيات","owner_role":"executive",     "sla_hours":120,"evidence":true},
      {"step_code":"sod_recheck",            "title_en":"SoD recheck on uplifted role",   "title_ar":"إعادة فحص الفصل بين المهام", "owner_role":"foundation_admin", "sla_hours":1,  "evidence":true},
      {"step_code":"announce_apply",         "title_en":"Announce + apply",               "title_ar":"الإعلان والتطبيق",           "owner_role":"hr_manager",       "sla_hours":48, "evidence":true}
    ]'::jsonb,
   336),

  ('termination', NULL,
   'Termination (For Cause)', 'إنهاء الخدمة (لأسباب)',
   'Legal + HR + IT + finance gated. Higher evidence bar than offboarding.',
   'بوابات قانونية وموارد بشرية وتقنية ومالية. مستوى أدلة أعلى من إنهاء الخدمة العادي.',
   'exiting',
   '[
      {"step_code":"legal_review",           "title_en":"Legal review of cause",          "title_ar":"المراجعة القانونية للأسباب", "owner_role":"legal_counsel",    "sla_hours":24, "evidence":true},
      {"step_code":"hr_documentation",       "title_en":"HR documentation pack",          "title_ar":"حزمة التوثيق الموارد البشرية","owner_role":"hr_manager",      "sla_hours":24, "evidence":true},
      {"step_code":"immediate_revoke",       "title_en":"Immediate access revoke",        "title_ar":"إلغاء الصلاحيات الفوري",     "owner_role":"foundation_admin", "sla_hours":1,  "evidence":true},
      {"step_code":"finance_clearance",      "title_en":"Finance clearance",              "title_ar":"تخليص الشؤون المالية",       "owner_role":"finance_lead",     "sla_hours":48, "evidence":true},
      {"step_code":"asset_recovery",         "title_en":"Asset recovery (forensic)",      "title_ar":"استرداد الأصول (جنائي)",     "owner_role":"foundation_admin", "sla_hours":48, "evidence":true},
      {"step_code":"regulator_notify",       "title_en":"Regulator notification (if req.)","title_ar":"إخطار الجهة التنظيمية (عند اللزوم)","owner_role":"compliance_officer","sla_hours":72,"evidence":true}
    ]'::jsonb,
   168),

  ('probation_review', NULL,
   'Probation Review (Day 90)', 'مراجعة فترة التجربة (اليوم 90)',
   'Confirm / Extend / Terminate decision. Mandatory manager + HR + skip-level signoff.',
   'قرار التثبيت / التمديد / الإنهاء. توقيع إلزامي من المدير والموارد البشرية والمدير الأعلى.',
   'probation',
   '[
      {"step_code":"manager_assessment",     "title_en":"Manager 90-day assessment",      "title_ar":"تقييم المدير لـ90 يوماً",     "owner_role":"line_manager",     "sla_hours":120,"evidence":true},
      {"step_code":"peer_feedback",          "title_en":"Peer feedback (3+ peers)",       "title_ar":"تغذية راجعة من 3 زملاء",     "owner_role":"line_manager",     "sla_hours":120,"evidence":true},
      {"step_code":"goal_attainment",        "title_en":"Goal attainment review",         "title_ar":"مراجعة تحقيق الأهداف",       "owner_role":"line_manager",     "sla_hours":72, "evidence":true},
      {"step_code":"skip_level_signoff",     "title_en":"Skip-level signoff",             "title_ar":"موافقة المدير الأعلى",       "owner_role":"executive",        "sla_hours":48, "evidence":true},
      {"step_code":"hr_decision",            "title_en":"HR decision: confirm/extend/exit","title_ar":"قرار الموارد البشرية: تثبيت/تمديد/إنهاء","owner_role":"hr_manager","sla_hours":24,"evidence":true}
    ]'::jsonb,
   336)
ON CONFLICT (tenant_id, workflow_code) DO UPDATE SET
  name_en        = EXCLUDED.name_en,
  name_ar        = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  trigger_state  = EXCLUDED.trigger_state,
  steps          = EXCLUDED.steps,
  sla_hours      = EXCLUDED.sla_hours,
  is_active      = true;
