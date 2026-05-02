BEGIN;
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='governance' AND view_code='governance_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'governance.col.code',       '120px',TRUE, TRUE, 1,'text',     'governance.record.read'),
  ('grc',(SELECT id FROM v),'title',         'governance.col.title',      NULL,   TRUE, TRUE, 2,'text',     'governance.record.read'),
  ('grc',(SELECT id FROM v),'state',         'governance.col.state',      '160px',TRUE, TRUE, 3,'state-chip','governance.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'governance.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','governance.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'governance.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'governance.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'governance.col.updated_at', '160px',TRUE, FALSE,6,'date',     'governance.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'governance.col.created_at', '160px',TRUE, FALSE,7,'date',     'governance.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'governance.col.actions',    '120px',FALSE,FALSE,8,'row-actions','governance.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='qiyas' AND view_code='qiyas_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'qiyas.col.code',       '120px',TRUE, TRUE, 1,'text',     'qiyas.record.read'),
  ('grc',(SELECT id FROM v),'title',         'qiyas.col.title',      NULL,   TRUE, TRUE, 2,'text',     'qiyas.record.read'),
  ('grc',(SELECT id FROM v),'state',         'qiyas.col.state',      '160px',TRUE, TRUE, 3,'state-chip','qiyas.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'qiyas.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','qiyas.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'qiyas.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'qiyas.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'qiyas.col.updated_at', '160px',TRUE, FALSE,6,'date',     'qiyas.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'qiyas.col.created_at', '160px',TRUE, FALSE,7,'date',     'qiyas.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'qiyas.col.actions',    '120px',FALSE,FALSE,8,'row-actions','qiyas.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='regulatory' AND view_code='regulatory_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'regulatory.col.code',       '120px',TRUE, TRUE, 1,'text',     'regulatory.record.read'),
  ('grc',(SELECT id FROM v),'title',         'regulatory.col.title',      NULL,   TRUE, TRUE, 2,'text',     'regulatory.record.read'),
  ('grc',(SELECT id FROM v),'state',         'regulatory.col.state',      '160px',TRUE, TRUE, 3,'state-chip','regulatory.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'regulatory.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','regulatory.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'regulatory.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'regulatory.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'regulatory.col.updated_at', '160px',TRUE, FALSE,6,'date',     'regulatory.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'regulatory.col.created_at', '160px',TRUE, FALSE,7,'date',     'regulatory.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'regulatory.col.actions',    '120px',FALSE,FALSE,8,'row-actions','regulatory.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='compliance' AND view_code='compliance_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'compliance.col.code',       '120px',TRUE, TRUE, 1,'text',     'compliance.record.read'),
  ('grc',(SELECT id FROM v),'title',         'compliance.col.title',      NULL,   TRUE, TRUE, 2,'text',     'compliance.record.read'),
  ('grc',(SELECT id FROM v),'state',         'compliance.col.state',      '160px',TRUE, TRUE, 3,'state-chip','compliance.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'compliance.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','compliance.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'compliance.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'compliance.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'compliance.col.updated_at', '160px',TRUE, FALSE,6,'date',     'compliance.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'compliance.col.created_at', '160px',TRUE, FALSE,7,'date',     'compliance.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'compliance.col.actions',    '120px',FALSE,FALSE,8,'row-actions','compliance.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='risk' AND view_code='risk_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'risk.col.code',       '120px',TRUE, TRUE, 1,'text',     'risk.record.read'),
  ('grc',(SELECT id FROM v),'title',         'risk.col.title',      NULL,   TRUE, TRUE, 2,'text',     'risk.record.read'),
  ('grc',(SELECT id FROM v),'state',         'risk.col.state',      '160px',TRUE, TRUE, 3,'state-chip','risk.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'risk.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','risk.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'risk.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'risk.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'risk.col.updated_at', '160px',TRUE, FALSE,6,'date',     'risk.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'risk.col.created_at', '160px',TRUE, FALSE,7,'date',     'risk.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'risk.col.actions',    '120px',FALSE,FALSE,8,'row-actions','risk.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='controls' AND view_code='controls_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'controls.col.code',       '120px',TRUE, TRUE, 1,'text',     'controls.record.read'),
  ('grc',(SELECT id FROM v),'title',         'controls.col.title',      NULL,   TRUE, TRUE, 2,'text',     'controls.record.read'),
  ('grc',(SELECT id FROM v),'state',         'controls.col.state',      '160px',TRUE, TRUE, 3,'state-chip','controls.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'controls.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','controls.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'controls.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'controls.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'controls.col.updated_at', '160px',TRUE, FALSE,6,'date',     'controls.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'controls.col.created_at', '160px',TRUE, FALSE,7,'date',     'controls.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'controls.col.actions',    '120px',FALSE,FALSE,8,'row-actions','controls.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='policy' AND view_code='policy_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'policy.col.code',       '120px',TRUE, TRUE, 1,'text',     'policy.record.read'),
  ('grc',(SELECT id FROM v),'title',         'policy.col.title',      NULL,   TRUE, TRUE, 2,'text',     'policy.record.read'),
  ('grc',(SELECT id FROM v),'state',         'policy.col.state',      '160px',TRUE, TRUE, 3,'state-chip','policy.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'policy.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','policy.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'policy.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'policy.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'policy.col.updated_at', '160px',TRUE, FALSE,6,'date',     'policy.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'policy.col.created_at', '160px',TRUE, FALSE,7,'date',     'policy.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'policy.col.actions',    '120px',FALSE,FALSE,8,'row-actions','policy.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='asset' AND view_code='asset_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'asset.col.code',       '120px',TRUE, TRUE, 1,'text',     'asset.record.read'),
  ('grc',(SELECT id FROM v),'title',         'asset.col.title',      NULL,   TRUE, TRUE, 2,'text',     'asset.record.read'),
  ('grc',(SELECT id FROM v),'state',         'asset.col.state',      '160px',TRUE, TRUE, 3,'state-chip','asset.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'asset.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','asset.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'asset.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'asset.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'asset.col.updated_at', '160px',TRUE, FALSE,6,'date',     'asset.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'asset.col.created_at', '160px',TRUE, FALSE,7,'date',     'asset.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'asset.col.actions',    '120px',FALSE,FALSE,8,'row-actions','asset.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='vendor' AND view_code='vendor_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'vendor.col.code',       '120px',TRUE, TRUE, 1,'text',     'vendor.record.read'),
  ('grc',(SELECT id FROM v),'title',         'vendor.col.title',      NULL,   TRUE, TRUE, 2,'text',     'vendor.record.read'),
  ('grc',(SELECT id FROM v),'state',         'vendor.col.state',      '160px',TRUE, TRUE, 3,'state-chip','vendor.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'vendor.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','vendor.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'vendor.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'vendor.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'vendor.col.updated_at', '160px',TRUE, FALSE,6,'date',     'vendor.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'vendor.col.created_at', '160px',TRUE, FALSE,7,'date',     'vendor.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'vendor.col.actions',    '120px',FALSE,FALSE,8,'row-actions','vendor.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='incident' AND view_code='incident_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'incident.col.code',       '120px',TRUE, TRUE, 1,'text',     'incident.record.read'),
  ('grc',(SELECT id FROM v),'title',         'incident.col.title',      NULL,   TRUE, TRUE, 2,'text',     'incident.record.read'),
  ('grc',(SELECT id FROM v),'state',         'incident.col.state',      '160px',TRUE, TRUE, 3,'state-chip','incident.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'incident.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','incident.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'incident.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'incident.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'incident.col.updated_at', '160px',TRUE, FALSE,6,'date',     'incident.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'incident.col.created_at', '160px',TRUE, FALSE,7,'date',     'incident.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'incident.col.actions',    '120px',FALSE,FALSE,8,'row-actions','incident.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='exceptions' AND view_code='exceptions_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'exceptions.col.code',       '120px',TRUE, TRUE, 1,'text',     'exceptions.record.read'),
  ('grc',(SELECT id FROM v),'title',         'exceptions.col.title',      NULL,   TRUE, TRUE, 2,'text',     'exceptions.record.read'),
  ('grc',(SELECT id FROM v),'state',         'exceptions.col.state',      '160px',TRUE, TRUE, 3,'state-chip','exceptions.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'exceptions.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','exceptions.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'exceptions.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'exceptions.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'exceptions.col.updated_at', '160px',TRUE, FALSE,6,'date',     'exceptions.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'exceptions.col.created_at', '160px',TRUE, FALSE,7,'date',     'exceptions.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'exceptions.col.actions',    '120px',FALSE,FALSE,8,'row-actions','exceptions.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='issues' AND view_code='issues_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'issues.col.code',       '120px',TRUE, TRUE, 1,'text',     'issues.record.read'),
  ('grc',(SELECT id FROM v),'title',         'issues.col.title',      NULL,   TRUE, TRUE, 2,'text',     'issues.record.read'),
  ('grc',(SELECT id FROM v),'state',         'issues.col.state',      '160px',TRUE, TRUE, 3,'state-chip','issues.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'issues.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','issues.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'issues.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'issues.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'issues.col.updated_at', '160px',TRUE, FALSE,6,'date',     'issues.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'issues.col.created_at', '160px',TRUE, FALSE,7,'date',     'issues.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'issues.col.actions',    '120px',FALSE,FALSE,8,'row-actions','issues.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='evidence' AND view_code='evidence_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'evidence.col.code',       '120px',TRUE, TRUE, 1,'text',     'evidence.record.read'),
  ('grc',(SELECT id FROM v),'title',         'evidence.col.title',      NULL,   TRUE, TRUE, 2,'text',     'evidence.record.read'),
  ('grc',(SELECT id FROM v),'state',         'evidence.col.state',      '160px',TRUE, TRUE, 3,'state-chip','evidence.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'evidence.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','evidence.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'evidence.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'evidence.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'evidence.col.updated_at', '160px',TRUE, FALSE,6,'date',     'evidence.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'evidence.col.created_at', '160px',TRUE, FALSE,7,'date',     'evidence.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'evidence.col.actions',    '120px',FALSE,FALSE,8,'row-actions','evidence.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='audit' AND view_code='audit_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'audit.col.code',       '120px',TRUE, TRUE, 1,'text',     'audit.record.read'),
  ('grc',(SELECT id FROM v),'title',         'audit.col.title',      NULL,   TRUE, TRUE, 2,'text',     'audit.record.read'),
  ('grc',(SELECT id FROM v),'state',         'audit.col.state',      '160px',TRUE, TRUE, 3,'state-chip','audit.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'audit.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','audit.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'audit.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'audit.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'audit.col.updated_at', '160px',TRUE, FALSE,6,'date',     'audit.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'audit.col.created_at', '160px',TRUE, FALSE,7,'date',     'audit.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'audit.col.actions',    '120px',FALSE,FALSE,8,'row-actions','audit.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='bcp' AND view_code='bcp_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'bcp.col.code',       '120px',TRUE, TRUE, 1,'text',     'bcp.record.read'),
  ('grc',(SELECT id FROM v),'title',         'bcp.col.title',      NULL,   TRUE, TRUE, 2,'text',     'bcp.record.read'),
  ('grc',(SELECT id FROM v),'state',         'bcp.col.state',      '160px',TRUE, TRUE, 3,'state-chip','bcp.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'bcp.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','bcp.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'bcp.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'bcp.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'bcp.col.updated_at', '160px',TRUE, FALSE,6,'date',     'bcp.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'bcp.col.created_at', '160px',TRUE, FALSE,7,'date',     'bcp.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'bcp.col.actions',    '120px',FALSE,FALSE,8,'row-actions','bcp.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='training' AND view_code='training_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'training.col.code',       '120px',TRUE, TRUE, 1,'text',     'training.record.read'),
  ('grc',(SELECT id FROM v),'title',         'training.col.title',      NULL,   TRUE, TRUE, 2,'text',     'training.record.read'),
  ('grc',(SELECT id FROM v),'state',         'training.col.state',      '160px',TRUE, TRUE, 3,'state-chip','training.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'training.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','training.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'training.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'training.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'training.col.updated_at', '160px',TRUE, FALSE,6,'date',     'training.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'training.col.created_at', '160px',TRUE, FALSE,7,'date',     'training.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'training.col.actions',    '120px',FALSE,FALSE,8,'row-actions','training.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='reporting' AND view_code='reporting_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'reporting.col.code',       '120px',TRUE, TRUE, 1,'text',     'reporting.record.read'),
  ('grc',(SELECT id FROM v),'title',         'reporting.col.title',      NULL,   TRUE, TRUE, 2,'text',     'reporting.record.read'),
  ('grc',(SELECT id FROM v),'state',         'reporting.col.state',      '160px',TRUE, TRUE, 3,'state-chip','reporting.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'reporting.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','reporting.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'reporting.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'reporting.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'reporting.col.updated_at', '160px',TRUE, FALSE,6,'date',     'reporting.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'reporting.col.created_at', '160px',TRUE, FALSE,7,'date',     'reporting.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'reporting.col.actions',    '120px',FALSE,FALSE,8,'row-actions','reporting.record.read');
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='ai_governance' AND view_code='ai_governance_list')
INSERT INTO dos.ui_column (profile_code, view_id, field, header_token, width, sortable, filterable, position, cell_renderer, required_permission) VALUES
  ('grc',(SELECT id FROM v),'code',          'ai_governance.col.code',       '120px',TRUE, TRUE, 1,'text',     'ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'title',         'ai_governance.col.title',      NULL,   TRUE, TRUE, 2,'text',     'ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'state',         'ai_governance.col.state',      '160px',TRUE, TRUE, 3,'state-chip','ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'owner_user_id', 'ai_governance.col.owner',      '180px',TRUE, TRUE, 4,'user-chip','ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'scope_level',   'ai_governance.col.scope',      '140px',TRUE, TRUE, 5,'tag',      'ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'updated_at',    'ai_governance.col.updated_at', '160px',TRUE, FALSE,6,'date',     'ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'created_at',    'ai_governance.col.created_at', '160px',TRUE, FALSE,7,'date',     'ai_governance.record.read'),
  ('grc',(SELECT id FROM v),'__actions',     'ai_governance.col.actions',    '120px',FALSE,FALSE,8,'row-actions','ai_governance.record.read');
COMMIT;
