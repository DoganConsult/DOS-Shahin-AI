-- =====================================================================
-- 0090 — Foundation props seed for 3 archetype-bound routes.
--
-- Migration 0080 bound /foundation/{ownership, hierarchy-viz,
-- user-lifecycle} to ownership-map / org-chart / workflow-timeline
-- archetypes. The props-coverage CI guard then reported 3 SHADOW
-- violations because the matching dos.ui_route_* tables had no rows
-- for these routes. This migration seeds a minimal but representative
-- bilingual (EN/AR) row-set so the props-coverage gate flips to GREEN
-- with PROPS_COVERAGE_ENFORCE=1.
-- =====================================================================
BEGIN;

-- ── /foundation/ownership → ownership-map (rows: ui_route_ownership_edge)
INSERT INTO dos.ui_route_ownership_edge
  (route, sort_order, edge_id, entity_id, entity_label, owner, ownership_role, effective_from, effective_to)
VALUES
  ('/foundation/ownership', 0, 'edge.ceo.org',        'org.acme',      'Acme Holding',           'CEO Office',          'accountable', '2024-01-01', NULL),
  ('/foundation/ownership', 1, 'edge.bu.finance',     'bu.finance',    'Finance Business Unit',  'CFO Office',          'responsible', '2024-01-01', NULL),
  ('/foundation/ownership', 2, 'edge.bu.tech',        'bu.tech',       'Technology BU',          'CTO Office',          'responsible', '2024-01-01', NULL),
  ('/foundation/ownership', 3, 'edge.dept.security',  'dept.security', 'Security Department',    'CISO',                'custodian',   '2024-01-01', NULL),
  ('/foundation/ownership', 4, 'edge.proc.payroll',   'proc.payroll',  'Payroll Process',        'Head of HR',          'approver',    '2024-01-01', NULL)
ON CONFLICT DO NOTHING;

-- ── /foundation/hierarchy-viz → org-chart (rows: ui_route_org_chart_node)
INSERT INTO dos.ui_route_org_chart_node
  (route, node_id, parent_id, sort_order, title_en, title_ar, role, owner, badge)
VALUES
  ('/foundation/hierarchy-viz', 'node.ceo',        NULL,            0, 'Chief Executive Officer',   'الرئيس التنفيذي',                 'CEO',  'Sara Al-Ahmad',  'C-Suite'),
  ('/foundation/hierarchy-viz', 'node.cfo',        'node.ceo',      1, 'Chief Financial Officer',   'المدير المالي',                   'CFO',  'Khaled Mansour', 'C-Suite'),
  ('/foundation/hierarchy-viz', 'node.cto',        'node.ceo',      2, 'Chief Technology Officer',  'مدير التقنية',                    'CTO',  'Lina Hassan',    'C-Suite'),
  ('/foundation/hierarchy-viz', 'node.ciso',      'node.cto',       3, 'Chief Information Security','مدير أمن المعلومات',              'CISO', 'Omar Fadhel',    'Security'),
  ('/foundation/hierarchy-viz', 'node.head_hr',   'node.ceo',       4, 'Head of Human Resources',   'مدير الموارد البشرية',           'HRM',  'Mona Saeed',     'People')
ON CONFLICT DO NOTHING;

-- ── /foundation/user-lifecycle → workflow-timeline (rows: ui_route_workflow_timeline_step)
INSERT INTO dos.ui_route_workflow_timeline_step
  (route, sort_order, step_id, label_en, label_ar, state, description, occurred_at, actor)
VALUES
  ('/foundation/user-lifecycle', 0, 'step.invite',       'Invitation sent',           'إرسال الدعوة',           'complete',   'Onboarding invite emailed to candidate.',                  '2026-04-01T09:00:00Z', 'system'),
  ('/foundation/user-lifecycle', 1, 'step.accept',       'Account activated',         'تفعيل الحساب',           'complete',   'User accepted invite and activated SSO.',                  '2026-04-02T10:15:00Z', 'user'),
  ('/foundation/user-lifecycle', 2, 'step.profile',      'Profile completed',         'استكمال الملف الشخصي',  'complete',   'Mandatory profile fields submitted.',                       '2026-04-03T08:40:00Z', 'user'),
  ('/foundation/user-lifecycle', 3, 'step.access',       'Access provisioned',        'منح الصلاحيات',          'current',    'Role assignment + entitlement provisioning in flight.',     NULL,                   'access-store'),
  ('/foundation/user-lifecycle', 4, 'step.training',     'Mandatory training',        'التدريب الإلزامي',       'incomplete', 'Awaiting completion of compliance training modules.',       NULL,                   'lms'),
  ('/foundation/user-lifecycle', 5, 'step.review',       'First quarterly review',    'المراجعة الفصلية الأولى','incomplete', 'Manager review scheduled at 90-day milestone.',             NULL,                   'manager')
ON CONFLICT DO NOTHING;

COMMIT;
