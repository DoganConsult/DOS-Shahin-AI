-- Carbon contract coherence: register one approved component per route.
-- Each row is gated by the trigger trg_carbon_only_runtime — vendor must be
-- ibm-carbon, approval_status must be approved, carbon_key must FK into
-- dos.ui_carbon_components.
BEGIN;
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('GovernanceListPage',      'ibm-carbon','approved','table',           '1', jsonb_build_object('module','governance','kind','list','profile','grc')),
  ('GovernanceDetailPage',    'ibm-carbon','approved','table',           '1', jsonb_build_object('module','governance','kind','detail','profile','grc')),
  ('GovernanceFormPage',      'ibm-carbon','approved','tiles',           '1', jsonb_build_object('module','governance','kind','form','profile','grc')),
  ('GovernanceDashboardPage', 'ibm-carbon','approved','tiles',           '1', jsonb_build_object('module','governance','kind','dashboard','profile','grc')),
  ('GovernanceSettingsPage',  'ibm-carbon','approved','structured-list', '1', jsonb_build_object('module','governance','kind','settings','profile','grc'))
ON CONFLICT (component_key) DO UPDATE
   SET vendor=EXCLUDED.vendor,
       approval_status=EXCLUDED.approval_status,
       carbon_key=EXCLUDED.carbon_key,
       schema_version=EXCLUDED.schema_version,
       metadata=EXCLUDED.metadata;
COMMIT;
