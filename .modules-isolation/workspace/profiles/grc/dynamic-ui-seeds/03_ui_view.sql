BEGIN;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','governance','governance_list','list',          'governance.title.list',     'governance_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'governance.record.read'),
  ('grc','governance','governance_detail','detail',      'governance.title.detail',   'governance_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'governance.record.read'),
  ('grc','governance','governance_dashboard','dashboard','governance.title.dashboard','governance_kpi_snapshot', '{"widgets":["governance_coverage","governance_overdue","governance_cycle"]}'::jsonb, 'governance.report.read'),
  ('grc','governance','governance_form','form',          'governance.title.form',     'governance_record', '{"form_code":"governance_main"}'::jsonb, 'governance.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','qiyas','qiyas_list','list',          'qiyas.title.list',     'qiyas_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'qiyas.record.read'),
  ('grc','qiyas','qiyas_detail','detail',      'qiyas.title.detail',   'qiyas_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'qiyas.record.read'),
  ('grc','qiyas','qiyas_dashboard','dashboard','qiyas.title.dashboard','qiyas_kpi_snapshot', '{"widgets":["qiyas_coverage","qiyas_overdue","qiyas_cycle"]}'::jsonb, 'qiyas.report.read'),
  ('grc','qiyas','qiyas_form','form',          'qiyas.title.form',     'qiyas_record', '{"form_code":"qiyas_main"}'::jsonb, 'qiyas.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','regulatory','regulatory_list','list',          'regulatory.title.list',     'regulatory_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'regulatory.record.read'),
  ('grc','regulatory','regulatory_detail','detail',      'regulatory.title.detail',   'regulatory_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'regulatory.record.read'),
  ('grc','regulatory','regulatory_dashboard','dashboard','regulatory.title.dashboard','regulatory_kpi_snapshot', '{"widgets":["regulatory_coverage","regulatory_overdue","regulatory_cycle"]}'::jsonb, 'regulatory.report.read'),
  ('grc','regulatory','regulatory_form','form',          'regulatory.title.form',     'regulatory_record', '{"form_code":"regulatory_main"}'::jsonb, 'regulatory.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','compliance','compliance_list','list',          'compliance.title.list',     'compliance_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'compliance.record.read'),
  ('grc','compliance','compliance_detail','detail',      'compliance.title.detail',   'compliance_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'compliance.record.read'),
  ('grc','compliance','compliance_dashboard','dashboard','compliance.title.dashboard','compliance_kpi_snapshot', '{"widgets":["compliance_coverage","compliance_overdue","compliance_cycle"]}'::jsonb, 'compliance.report.read'),
  ('grc','compliance','compliance_form','form',          'compliance.title.form',     'compliance_record', '{"form_code":"compliance_main"}'::jsonb, 'compliance.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','risk','risk_list','list',          'risk.title.list',     'risk_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'risk.record.read'),
  ('grc','risk','risk_detail','detail',      'risk.title.detail',   'risk_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'risk.record.read'),
  ('grc','risk','risk_dashboard','dashboard','risk.title.dashboard','risk_kpi_snapshot', '{"widgets":["risk_coverage","risk_overdue","risk_cycle"]}'::jsonb, 'risk.report.read'),
  ('grc','risk','risk_form','form',          'risk.title.form',     'risk_record', '{"form_code":"risk_main"}'::jsonb, 'risk.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','controls','controls_list','list',          'controls.title.list',     'controls_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'controls.record.read'),
  ('grc','controls','controls_detail','detail',      'controls.title.detail',   'controls_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'controls.record.read'),
  ('grc','controls','controls_dashboard','dashboard','controls.title.dashboard','controls_kpi_snapshot', '{"widgets":["controls_coverage","controls_overdue","controls_cycle"]}'::jsonb, 'controls.report.read'),
  ('grc','controls','controls_form','form',          'controls.title.form',     'controls_record', '{"form_code":"controls_main"}'::jsonb, 'controls.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','policy','policy_list','list',          'policy.title.list',     'policy_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'policy.record.read'),
  ('grc','policy','policy_detail','detail',      'policy.title.detail',   'policy_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'policy.record.read'),
  ('grc','policy','policy_dashboard','dashboard','policy.title.dashboard','policy_kpi_snapshot', '{"widgets":["policy_coverage","policy_overdue","policy_cycle"]}'::jsonb, 'policy.report.read'),
  ('grc','policy','policy_form','form',          'policy.title.form',     'policy_record', '{"form_code":"policy_main"}'::jsonb, 'policy.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','asset','asset_list','list',          'asset.title.list',     'asset_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'asset.record.read'),
  ('grc','asset','asset_detail','detail',      'asset.title.detail',   'asset_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'asset.record.read'),
  ('grc','asset','asset_dashboard','dashboard','asset.title.dashboard','asset_kpi_snapshot', '{"widgets":["asset_coverage","asset_overdue","asset_cycle"]}'::jsonb, 'asset.report.read'),
  ('grc','asset','asset_form','form',          'asset.title.form',     'asset_record', '{"form_code":"asset_main"}'::jsonb, 'asset.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','vendor','vendor_list','list',          'vendor.title.list',     'vendor_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'vendor.record.read'),
  ('grc','vendor','vendor_detail','detail',      'vendor.title.detail',   'vendor_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'vendor.record.read'),
  ('grc','vendor','vendor_dashboard','dashboard','vendor.title.dashboard','vendor_kpi_snapshot', '{"widgets":["vendor_coverage","vendor_overdue","vendor_cycle"]}'::jsonb, 'vendor.report.read'),
  ('grc','vendor','vendor_form','form',          'vendor.title.form',     'vendor_record', '{"form_code":"vendor_main"}'::jsonb, 'vendor.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','incident','incident_list','list',          'incident.title.list',     'incident_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'incident.record.read'),
  ('grc','incident','incident_detail','detail',      'incident.title.detail',   'incident_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'incident.record.read'),
  ('grc','incident','incident_dashboard','dashboard','incident.title.dashboard','incident_kpi_snapshot', '{"widgets":["incident_coverage","incident_overdue","incident_cycle"]}'::jsonb, 'incident.report.read'),
  ('grc','incident','incident_form','form',          'incident.title.form',     'incident_record', '{"form_code":"incident_main"}'::jsonb, 'incident.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','exceptions','exceptions_list','list',          'exceptions.title.list',     'exceptions_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'exceptions.record.read'),
  ('grc','exceptions','exceptions_detail','detail',      'exceptions.title.detail',   'exceptions_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'exceptions.record.read'),
  ('grc','exceptions','exceptions_dashboard','dashboard','exceptions.title.dashboard','exceptions_kpi_snapshot', '{"widgets":["exceptions_coverage","exceptions_overdue","exceptions_cycle"]}'::jsonb, 'exceptions.report.read'),
  ('grc','exceptions','exceptions_form','form',          'exceptions.title.form',     'exceptions_record', '{"form_code":"exceptions_main"}'::jsonb, 'exceptions.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','issues','issues_list','list',          'issues.title.list',     'issues_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'issues.record.read'),
  ('grc','issues','issues_detail','detail',      'issues.title.detail',   'issues_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'issues.record.read'),
  ('grc','issues','issues_dashboard','dashboard','issues.title.dashboard','issues_kpi_snapshot', '{"widgets":["issues_coverage","issues_overdue","issues_cycle"]}'::jsonb, 'issues.report.read'),
  ('grc','issues','issues_form','form',          'issues.title.form',     'issues_record', '{"form_code":"issues_main"}'::jsonb, 'issues.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','evidence','evidence_list','list',          'evidence.title.list',     'evidence_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'evidence.record.read'),
  ('grc','evidence','evidence_detail','detail',      'evidence.title.detail',   'evidence_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'evidence.record.read'),
  ('grc','evidence','evidence_dashboard','dashboard','evidence.title.dashboard','evidence_kpi_snapshot', '{"widgets":["evidence_coverage","evidence_overdue","evidence_cycle"]}'::jsonb, 'evidence.report.read'),
  ('grc','evidence','evidence_form','form',          'evidence.title.form',     'evidence_record', '{"form_code":"evidence_main"}'::jsonb, 'evidence.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','audit','audit_list','list',          'audit.title.list',     'audit_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'audit.record.read'),
  ('grc','audit','audit_detail','detail',      'audit.title.detail',   'audit_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'audit.record.read'),
  ('grc','audit','audit_dashboard','dashboard','audit.title.dashboard','audit_kpi_snapshot', '{"widgets":["audit_coverage","audit_overdue","audit_cycle"]}'::jsonb, 'audit.report.read'),
  ('grc','audit','audit_form','form',          'audit.title.form',     'audit_record', '{"form_code":"audit_main"}'::jsonb, 'audit.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','bcp','bcp_list','list',          'bcp.title.list',     'bcp_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'bcp.record.read'),
  ('grc','bcp','bcp_detail','detail',      'bcp.title.detail',   'bcp_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'bcp.record.read'),
  ('grc','bcp','bcp_dashboard','dashboard','bcp.title.dashboard','bcp_kpi_snapshot', '{"widgets":["bcp_coverage","bcp_overdue","bcp_cycle"]}'::jsonb, 'bcp.report.read'),
  ('grc','bcp','bcp_form','form',          'bcp.title.form',     'bcp_record', '{"form_code":"bcp_main"}'::jsonb, 'bcp.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','training','training_list','list',          'training.title.list',     'training_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'training.record.read'),
  ('grc','training','training_detail','detail',      'training.title.detail',   'training_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'training.record.read'),
  ('grc','training','training_dashboard','dashboard','training.title.dashboard','training_kpi_snapshot', '{"widgets":["training_coverage","training_overdue","training_cycle"]}'::jsonb, 'training.report.read'),
  ('grc','training','training_form','form',          'training.title.form',     'training_record', '{"form_code":"training_main"}'::jsonb, 'training.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','reporting','reporting_list','list',          'reporting.title.list',     'reporting_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'reporting.record.read'),
  ('grc','reporting','reporting_detail','detail',      'reporting.title.detail',   'reporting_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'reporting.record.read'),
  ('grc','reporting','reporting_dashboard','dashboard','reporting.title.dashboard','reporting_kpi_snapshot', '{"widgets":["reporting_coverage","reporting_overdue","reporting_cycle"]}'::jsonb, 'reporting.report.read'),
  ('grc','reporting','reporting_form','form',          'reporting.title.form',     'reporting_record', '{"form_code":"reporting_main"}'::jsonb, 'reporting.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
INSERT INTO dos.ui_view (profile_code, module_code, view_code, kind, title_token, data_source, spec, required_permission) VALUES
  ('grc','ai_governance','ai_governance_list','list',          'ai_governance.title.list',     'ai_governance_record', '{"layout":"datagrid","page_size":25}'::jsonb, 'ai_governance.record.read'),
  ('grc','ai_governance','ai_governance_detail','detail',      'ai_governance.title.detail',   'ai_governance_record', '{"sections":["overview","raci","evidence","workflow","audit","kpi"]}'::jsonb, 'ai_governance.record.read'),
  ('grc','ai_governance','ai_governance_dashboard','dashboard','ai_governance.title.dashboard','ai_governance_kpi_snapshot', '{"widgets":["ai_governance_coverage","ai_governance_overdue","ai_governance_cycle"]}'::jsonb, 'ai_governance.report.read'),
  ('grc','ai_governance','ai_governance_form','form',          'ai_governance.title.form',     'ai_governance_record', '{"form_code":"ai_governance_main"}'::jsonb, 'ai_governance.record.write')
ON CONFLICT (profile_code, module_code, view_code) DO NOTHING;
COMMIT;
