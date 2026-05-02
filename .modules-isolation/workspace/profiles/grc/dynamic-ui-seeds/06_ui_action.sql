BEGIN;
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='governance' AND view_code='governance_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'governance.act.create',  'toolbar','governance.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'governance.act.export',  'toolbar','governance.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'governance.act.view',    'row',    'governance.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'governance.act.edit',    'row',    'governance.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'governance.act.approve', 'row',    'governance.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'governance.act.archive', 'row',    'governance.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'governance.act.delete',  'row',    'governance.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','governance.act.bulk_assign','bulk','governance.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='qiyas' AND view_code='qiyas_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'qiyas.act.create',  'toolbar','qiyas.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'qiyas.act.export',  'toolbar','qiyas.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'qiyas.act.view',    'row',    'qiyas.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'qiyas.act.edit',    'row',    'qiyas.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'qiyas.act.approve', 'row',    'qiyas.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'qiyas.act.archive', 'row',    'qiyas.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'qiyas.act.delete',  'row',    'qiyas.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','qiyas.act.bulk_assign','bulk','qiyas.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='regulatory' AND view_code='regulatory_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'regulatory.act.create',  'toolbar','regulatory.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'regulatory.act.export',  'toolbar','regulatory.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'regulatory.act.view',    'row',    'regulatory.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'regulatory.act.edit',    'row',    'regulatory.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'regulatory.act.approve', 'row',    'regulatory.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'regulatory.act.archive', 'row',    'regulatory.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'regulatory.act.delete',  'row',    'regulatory.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','regulatory.act.bulk_assign','bulk','regulatory.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='compliance' AND view_code='compliance_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'compliance.act.create',  'toolbar','compliance.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'compliance.act.export',  'toolbar','compliance.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'compliance.act.view',    'row',    'compliance.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'compliance.act.edit',    'row',    'compliance.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'compliance.act.approve', 'row',    'compliance.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'compliance.act.archive', 'row',    'compliance.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'compliance.act.delete',  'row',    'compliance.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','compliance.act.bulk_assign','bulk','compliance.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='risk' AND view_code='risk_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'risk.act.create',  'toolbar','risk.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'risk.act.export',  'toolbar','risk.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'risk.act.view',    'row',    'risk.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'risk.act.edit',    'row',    'risk.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'risk.act.approve', 'row',    'risk.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'risk.act.archive', 'row',    'risk.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'risk.act.delete',  'row',    'risk.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','risk.act.bulk_assign','bulk','risk.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='controls' AND view_code='controls_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'controls.act.create',  'toolbar','controls.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'controls.act.export',  'toolbar','controls.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'controls.act.view',    'row',    'controls.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'controls.act.edit',    'row',    'controls.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'controls.act.approve', 'row',    'controls.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'controls.act.archive', 'row',    'controls.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'controls.act.delete',  'row',    'controls.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','controls.act.bulk_assign','bulk','controls.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='policy' AND view_code='policy_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'policy.act.create',  'toolbar','policy.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'policy.act.export',  'toolbar','policy.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'policy.act.view',    'row',    'policy.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'policy.act.edit',    'row',    'policy.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'policy.act.approve', 'row',    'policy.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'policy.act.archive', 'row',    'policy.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'policy.act.delete',  'row',    'policy.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','policy.act.bulk_assign','bulk','policy.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='asset' AND view_code='asset_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'asset.act.create',  'toolbar','asset.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'asset.act.export',  'toolbar','asset.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'asset.act.view',    'row',    'asset.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'asset.act.edit',    'row',    'asset.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'asset.act.approve', 'row',    'asset.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'asset.act.archive', 'row',    'asset.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'asset.act.delete',  'row',    'asset.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','asset.act.bulk_assign','bulk','asset.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='vendor' AND view_code='vendor_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'vendor.act.create',  'toolbar','vendor.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'vendor.act.export',  'toolbar','vendor.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'vendor.act.view',    'row',    'vendor.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'vendor.act.edit',    'row',    'vendor.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'vendor.act.approve', 'row',    'vendor.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'vendor.act.archive', 'row',    'vendor.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'vendor.act.delete',  'row',    'vendor.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','vendor.act.bulk_assign','bulk','vendor.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='incident' AND view_code='incident_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'incident.act.create',  'toolbar','incident.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'incident.act.export',  'toolbar','incident.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'incident.act.view',    'row',    'incident.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'incident.act.edit',    'row',    'incident.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'incident.act.approve', 'row',    'incident.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'incident.act.archive', 'row',    'incident.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'incident.act.delete',  'row',    'incident.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','incident.act.bulk_assign','bulk','incident.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='exceptions' AND view_code='exceptions_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'exceptions.act.create',  'toolbar','exceptions.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'exceptions.act.export',  'toolbar','exceptions.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'exceptions.act.view',    'row',    'exceptions.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'exceptions.act.edit',    'row',    'exceptions.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'exceptions.act.approve', 'row',    'exceptions.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'exceptions.act.archive', 'row',    'exceptions.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'exceptions.act.delete',  'row',    'exceptions.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','exceptions.act.bulk_assign','bulk','exceptions.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='issues' AND view_code='issues_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'issues.act.create',  'toolbar','issues.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'issues.act.export',  'toolbar','issues.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'issues.act.view',    'row',    'issues.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'issues.act.edit',    'row',    'issues.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'issues.act.approve', 'row',    'issues.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'issues.act.archive', 'row',    'issues.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'issues.act.delete',  'row',    'issues.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','issues.act.bulk_assign','bulk','issues.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='evidence' AND view_code='evidence_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'evidence.act.create',  'toolbar','evidence.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'evidence.act.export',  'toolbar','evidence.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'evidence.act.view',    'row',    'evidence.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'evidence.act.edit',    'row',    'evidence.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'evidence.act.approve', 'row',    'evidence.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'evidence.act.archive', 'row',    'evidence.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'evidence.act.delete',  'row',    'evidence.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','evidence.act.bulk_assign','bulk','evidence.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='audit' AND view_code='audit_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'audit.act.create',  'toolbar','audit.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'audit.act.export',  'toolbar','audit.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'audit.act.view',    'row',    'audit.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'audit.act.edit',    'row',    'audit.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'audit.act.approve', 'row',    'audit.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'audit.act.archive', 'row',    'audit.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'audit.act.delete',  'row',    'audit.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','audit.act.bulk_assign','bulk','audit.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='bcp' AND view_code='bcp_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'bcp.act.create',  'toolbar','bcp.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'bcp.act.export',  'toolbar','bcp.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'bcp.act.view',    'row',    'bcp.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'bcp.act.edit',    'row',    'bcp.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'bcp.act.approve', 'row',    'bcp.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'bcp.act.archive', 'row',    'bcp.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'bcp.act.delete',  'row',    'bcp.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','bcp.act.bulk_assign','bulk','bcp.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='training' AND view_code='training_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'training.act.create',  'toolbar','training.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'training.act.export',  'toolbar','training.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'training.act.view',    'row',    'training.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'training.act.edit',    'row',    'training.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'training.act.approve', 'row',    'training.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'training.act.archive', 'row',    'training.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'training.act.delete',  'row',    'training.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','training.act.bulk_assign','bulk','training.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='reporting' AND view_code='reporting_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'reporting.act.create',  'toolbar','reporting.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'reporting.act.export',  'toolbar','reporting.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'reporting.act.view',    'row',    'reporting.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'reporting.act.edit',    'row',    'reporting.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'reporting.act.approve', 'row',    'reporting.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'reporting.act.archive', 'row',    'reporting.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'reporting.act.delete',  'row',    'reporting.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','reporting.act.bulk_assign','bulk','reporting.record.manage','owner_assigned',  FALSE);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='ai_governance' AND view_code='ai_governance_list')
INSERT INTO dos.ui_action (profile_code, view_id, code, label_token, kind, required_permission, workflow_event, confirm) VALUES
  ('grc',(SELECT id FROM v),'create',  'ai_governance.act.create',  'toolbar','ai_governance.record.write',   'submit',           FALSE),
  ('grc',(SELECT id FROM v),'export',  'ai_governance.act.export',  'toolbar','ai_governance.export',         NULL,               FALSE),
  ('grc',(SELECT id FROM v),'view',    'ai_governance.act.view',    'row',    'ai_governance.record.read',    NULL,               FALSE),
  ('grc',(SELECT id FROM v),'edit',    'ai_governance.act.edit',    'row',    'ai_governance.record.write',   NULL,               FALSE),
  ('grc',(SELECT id FROM v),'approve', 'ai_governance.act.approve', 'row',    'ai_governance.record.approve', 'approve',          TRUE ),
  ('grc',(SELECT id FROM v),'archive', 'ai_governance.act.archive', 'row',    'ai_governance.record.manage',  'retention_elapsed',TRUE ),
  ('grc',(SELECT id FROM v),'delete',  'ai_governance.act.delete',  'row',    'ai_governance.record.delete',  NULL,               TRUE ),
  ('grc',(SELECT id FROM v),'bulk_assign','ai_governance.act.bulk_assign','bulk','ai_governance.record.manage','owner_assigned',  FALSE);
COMMIT;
