BEGIN;
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','governance','governance_coverage','kpi',  'governance.kpi.coverage_pct',    'governance_kpi_snapshot', '{"kpi_code":"governance.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','governance','governance_overdue', 'kpi',  'governance.kri.overdue_count',   'governance_kpi_snapshot', '{"kpi_code":"governance.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','governance','governance_cycle',   'chart','governance.kpi.avg_cycle_hours', 'governance_kpi_snapshot', '{"kpi_code":"governance.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','qiyas','qiyas_coverage','kpi',  'qiyas.kpi.coverage_pct',    'qiyas_kpi_snapshot', '{"kpi_code":"qiyas.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','qiyas','qiyas_overdue', 'kpi',  'qiyas.kri.overdue_count',   'qiyas_kpi_snapshot', '{"kpi_code":"qiyas.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','qiyas','qiyas_cycle',   'chart','qiyas.kpi.avg_cycle_hours', 'qiyas_kpi_snapshot', '{"kpi_code":"qiyas.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','regulatory','regulatory_coverage','kpi',  'regulatory.kpi.coverage_pct',    'regulatory_kpi_snapshot', '{"kpi_code":"regulatory.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','regulatory','regulatory_overdue', 'kpi',  'regulatory.kri.overdue_count',   'regulatory_kpi_snapshot', '{"kpi_code":"regulatory.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','regulatory','regulatory_cycle',   'chart','regulatory.kpi.avg_cycle_hours', 'regulatory_kpi_snapshot', '{"kpi_code":"regulatory.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','compliance','compliance_coverage','kpi',  'compliance.kpi.coverage_pct',    'compliance_kpi_snapshot', '{"kpi_code":"compliance.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','compliance','compliance_overdue', 'kpi',  'compliance.kri.overdue_count',   'compliance_kpi_snapshot', '{"kpi_code":"compliance.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','compliance','compliance_cycle',   'chart','compliance.kpi.avg_cycle_hours', 'compliance_kpi_snapshot', '{"kpi_code":"compliance.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','risk','risk_coverage','kpi',  'risk.kpi.coverage_pct',    'risk_kpi_snapshot', '{"kpi_code":"risk.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','risk','risk_overdue', 'kpi',  'risk.kri.overdue_count',   'risk_kpi_snapshot', '{"kpi_code":"risk.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','risk','risk_cycle',   'chart','risk.kpi.avg_cycle_hours', 'risk_kpi_snapshot', '{"kpi_code":"risk.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','controls','controls_coverage','kpi',  'controls.kpi.coverage_pct',    'controls_kpi_snapshot', '{"kpi_code":"controls.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','controls','controls_overdue', 'kpi',  'controls.kri.overdue_count',   'controls_kpi_snapshot', '{"kpi_code":"controls.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','controls','controls_cycle',   'chart','controls.kpi.avg_cycle_hours', 'controls_kpi_snapshot', '{"kpi_code":"controls.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','policy','policy_coverage','kpi',  'policy.kpi.coverage_pct',    'policy_kpi_snapshot', '{"kpi_code":"policy.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','policy','policy_overdue', 'kpi',  'policy.kri.overdue_count',   'policy_kpi_snapshot', '{"kpi_code":"policy.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','policy','policy_cycle',   'chart','policy.kpi.avg_cycle_hours', 'policy_kpi_snapshot', '{"kpi_code":"policy.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','asset','asset_coverage','kpi',  'asset.kpi.coverage_pct',    'asset_kpi_snapshot', '{"kpi_code":"asset.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','asset','asset_overdue', 'kpi',  'asset.kri.overdue_count',   'asset_kpi_snapshot', '{"kpi_code":"asset.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','asset','asset_cycle',   'chart','asset.kpi.avg_cycle_hours', 'asset_kpi_snapshot', '{"kpi_code":"asset.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','vendor','vendor_coverage','kpi',  'vendor.kpi.coverage_pct',    'vendor_kpi_snapshot', '{"kpi_code":"vendor.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','vendor','vendor_overdue', 'kpi',  'vendor.kri.overdue_count',   'vendor_kpi_snapshot', '{"kpi_code":"vendor.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','vendor','vendor_cycle',   'chart','vendor.kpi.avg_cycle_hours', 'vendor_kpi_snapshot', '{"kpi_code":"vendor.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','incident','incident_coverage','kpi',  'incident.kpi.coverage_pct',    'incident_kpi_snapshot', '{"kpi_code":"incident.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','incident','incident_overdue', 'kpi',  'incident.kri.overdue_count',   'incident_kpi_snapshot', '{"kpi_code":"incident.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','incident','incident_cycle',   'chart','incident.kpi.avg_cycle_hours', 'incident_kpi_snapshot', '{"kpi_code":"incident.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','exceptions','exceptions_coverage','kpi',  'exceptions.kpi.coverage_pct',    'exceptions_kpi_snapshot', '{"kpi_code":"exceptions.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','exceptions','exceptions_overdue', 'kpi',  'exceptions.kri.overdue_count',   'exceptions_kpi_snapshot', '{"kpi_code":"exceptions.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','exceptions','exceptions_cycle',   'chart','exceptions.kpi.avg_cycle_hours', 'exceptions_kpi_snapshot', '{"kpi_code":"exceptions.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','issues','issues_coverage','kpi',  'issues.kpi.coverage_pct',    'issues_kpi_snapshot', '{"kpi_code":"issues.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','issues','issues_overdue', 'kpi',  'issues.kri.overdue_count',   'issues_kpi_snapshot', '{"kpi_code":"issues.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','issues','issues_cycle',   'chart','issues.kpi.avg_cycle_hours', 'issues_kpi_snapshot', '{"kpi_code":"issues.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','evidence','evidence_coverage','kpi',  'evidence.kpi.coverage_pct',    'evidence_kpi_snapshot', '{"kpi_code":"evidence.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','evidence','evidence_overdue', 'kpi',  'evidence.kri.overdue_count',   'evidence_kpi_snapshot', '{"kpi_code":"evidence.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','evidence','evidence_cycle',   'chart','evidence.kpi.avg_cycle_hours', 'evidence_kpi_snapshot', '{"kpi_code":"evidence.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','audit','audit_coverage','kpi',  'audit.kpi.coverage_pct',    'audit_kpi_snapshot', '{"kpi_code":"audit.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','audit','audit_overdue', 'kpi',  'audit.kri.overdue_count',   'audit_kpi_snapshot', '{"kpi_code":"audit.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','audit','audit_cycle',   'chart','audit.kpi.avg_cycle_hours', 'audit_kpi_snapshot', '{"kpi_code":"audit.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','bcp','bcp_coverage','kpi',  'bcp.kpi.coverage_pct',    'bcp_kpi_snapshot', '{"kpi_code":"bcp.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','bcp','bcp_overdue', 'kpi',  'bcp.kri.overdue_count',   'bcp_kpi_snapshot', '{"kpi_code":"bcp.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','bcp','bcp_cycle',   'chart','bcp.kpi.avg_cycle_hours', 'bcp_kpi_snapshot', '{"kpi_code":"bcp.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','training','training_coverage','kpi',  'training.kpi.coverage_pct',    'training_kpi_snapshot', '{"kpi_code":"training.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','training','training_overdue', 'kpi',  'training.kri.overdue_count',   'training_kpi_snapshot', '{"kpi_code":"training.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','training','training_cycle',   'chart','training.kpi.avg_cycle_hours', 'training_kpi_snapshot', '{"kpi_code":"training.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','reporting','reporting_coverage','kpi',  'reporting.kpi.coverage_pct',    'reporting_kpi_snapshot', '{"kpi_code":"reporting.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','reporting','reporting_overdue', 'kpi',  'reporting.kri.overdue_count',   'reporting_kpi_snapshot', '{"kpi_code":"reporting.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','reporting','reporting_cycle',   'chart','reporting.kpi.avg_cycle_hours', 'reporting_kpi_snapshot', '{"kpi_code":"reporting.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
INSERT INTO dos.ui_widget (profile_code, module_code, widget_code, kind, title_token, data_source, config, default_size) VALUES
  ('grc','ai_governance','ai_governance_coverage','kpi',  'ai_governance.kpi.coverage_pct',    'ai_governance_kpi_snapshot', '{"kpi_code":"ai_governance.coverage_pct","format":"percent","trend":true}'::jsonb,'small'),
  ('grc','ai_governance','ai_governance_overdue', 'kpi',  'ai_governance.kri.overdue_count',   'ai_governance_kpi_snapshot', '{"kpi_code":"ai_governance.overdue_count","format":"int","threshold_warn":5}'::jsonb,'small'),
  ('grc','ai_governance','ai_governance_cycle',   'chart','ai_governance.kpi.avg_cycle_hours', 'ai_governance_kpi_snapshot', '{"kpi_code":"ai_governance.avg_cycle_hours","chart":"area","window":"30d"}'::jsonb,'medium');
COMMIT;
