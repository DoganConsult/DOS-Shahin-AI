BEGIN;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','governance','/governance',                'list',     'standard', 'governance.record.read',      '{}'),
  ('grc','governance','/governance/:id',            'detail',   'standard', 'governance.record.read',      '{}'),
  ('grc','governance','/governance/new',            'form',     'standard', 'governance.record.write',     '{}'),
  ('grc','governance','/governance/dashboard',      'dashboard','wide',     'governance.report.read',      '{}'),
  ('grc','governance','/governance/settings',       'settings', 'standard', 'governance.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','qiyas','/qiyas',                'list',     'standard', 'qiyas.record.read',      '{}'),
  ('grc','qiyas','/qiyas/:id',            'detail',   'standard', 'qiyas.record.read',      '{}'),
  ('grc','qiyas','/qiyas/new',            'form',     'standard', 'qiyas.record.write',     '{}'),
  ('grc','qiyas','/qiyas/dashboard',      'dashboard','wide',     'qiyas.report.read',      '{}'),
  ('grc','qiyas','/qiyas/settings',       'settings', 'standard', 'qiyas.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','regulatory','/regulatory',                'list',     'standard', 'regulatory.record.read',      '{}'),
  ('grc','regulatory','/regulatory/:id',            'detail',   'standard', 'regulatory.record.read',      '{}'),
  ('grc','regulatory','/regulatory/new',            'form',     'standard', 'regulatory.record.write',     '{}'),
  ('grc','regulatory','/regulatory/dashboard',      'dashboard','wide',     'regulatory.report.read',      '{}'),
  ('grc','regulatory','/regulatory/settings',       'settings', 'standard', 'regulatory.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','compliance','/compliance',                'list',     'standard', 'compliance.record.read',      '{}'),
  ('grc','compliance','/compliance/:id',            'detail',   'standard', 'compliance.record.read',      '{}'),
  ('grc','compliance','/compliance/new',            'form',     'standard', 'compliance.record.write',     '{}'),
  ('grc','compliance','/compliance/dashboard',      'dashboard','wide',     'compliance.report.read',      '{}'),
  ('grc','compliance','/compliance/settings',       'settings', 'standard', 'compliance.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','risk','/risk',                'list',     'standard', 'risk.record.read',      '{}'),
  ('grc','risk','/risk/:id',            'detail',   'standard', 'risk.record.read',      '{}'),
  ('grc','risk','/risk/new',            'form',     'standard', 'risk.record.write',     '{}'),
  ('grc','risk','/risk/dashboard',      'dashboard','wide',     'risk.report.read',      '{}'),
  ('grc','risk','/risk/settings',       'settings', 'standard', 'risk.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','controls','/controls',                'list',     'standard', 'controls.record.read',      '{}'),
  ('grc','controls','/controls/:id',            'detail',   'standard', 'controls.record.read',      '{}'),
  ('grc','controls','/controls/new',            'form',     'standard', 'controls.record.write',     '{}'),
  ('grc','controls','/controls/dashboard',      'dashboard','wide',     'controls.report.read',      '{}'),
  ('grc','controls','/controls/settings',       'settings', 'standard', 'controls.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','policy','/policy',                'list',     'standard', 'policy.record.read',      '{}'),
  ('grc','policy','/policy/:id',            'detail',   'standard', 'policy.record.read',      '{}'),
  ('grc','policy','/policy/new',            'form',     'standard', 'policy.record.write',     '{}'),
  ('grc','policy','/policy/dashboard',      'dashboard','wide',     'policy.report.read',      '{}'),
  ('grc','policy','/policy/settings',       'settings', 'standard', 'policy.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','asset','/asset',                'list',     'standard', 'asset.record.read',      '{}'),
  ('grc','asset','/asset/:id',            'detail',   'standard', 'asset.record.read',      '{}'),
  ('grc','asset','/asset/new',            'form',     'standard', 'asset.record.write',     '{}'),
  ('grc','asset','/asset/dashboard',      'dashboard','wide',     'asset.report.read',      '{}'),
  ('grc','asset','/asset/settings',       'settings', 'standard', 'asset.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','vendor','/vendor',                'list',     'standard', 'vendor.record.read',      '{}'),
  ('grc','vendor','/vendor/:id',            'detail',   'standard', 'vendor.record.read',      '{}'),
  ('grc','vendor','/vendor/new',            'form',     'standard', 'vendor.record.write',     '{}'),
  ('grc','vendor','/vendor/dashboard',      'dashboard','wide',     'vendor.report.read',      '{}'),
  ('grc','vendor','/vendor/settings',       'settings', 'standard', 'vendor.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','incident','/incident',                'list',     'standard', 'incident.record.read',      '{}'),
  ('grc','incident','/incident/:id',            'detail',   'standard', 'incident.record.read',      '{}'),
  ('grc','incident','/incident/new',            'form',     'standard', 'incident.record.write',     '{}'),
  ('grc','incident','/incident/dashboard',      'dashboard','wide',     'incident.report.read',      '{}'),
  ('grc','incident','/incident/settings',       'settings', 'standard', 'incident.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','exceptions','/exceptions',                'list',     'standard', 'exceptions.record.read',      '{}'),
  ('grc','exceptions','/exceptions/:id',            'detail',   'standard', 'exceptions.record.read',      '{}'),
  ('grc','exceptions','/exceptions/new',            'form',     'standard', 'exceptions.record.write',     '{}'),
  ('grc','exceptions','/exceptions/dashboard',      'dashboard','wide',     'exceptions.report.read',      '{}'),
  ('grc','exceptions','/exceptions/settings',       'settings', 'standard', 'exceptions.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','issues','/issues',                'list',     'standard', 'issues.record.read',      '{}'),
  ('grc','issues','/issues/:id',            'detail',   'standard', 'issues.record.read',      '{}'),
  ('grc','issues','/issues/new',            'form',     'standard', 'issues.record.write',     '{}'),
  ('grc','issues','/issues/dashboard',      'dashboard','wide',     'issues.report.read',      '{}'),
  ('grc','issues','/issues/settings',       'settings', 'standard', 'issues.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','evidence','/evidence',                'list',     'standard', 'evidence.record.read',      '{}'),
  ('grc','evidence','/evidence/:id',            'detail',   'standard', 'evidence.record.read',      '{}'),
  ('grc','evidence','/evidence/new',            'form',     'standard', 'evidence.record.write',     '{}'),
  ('grc','evidence','/evidence/dashboard',      'dashboard','wide',     'evidence.report.read',      '{}'),
  ('grc','evidence','/evidence/settings',       'settings', 'standard', 'evidence.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','audit','/audit',                'list',     'standard', 'audit.record.read',      '{}'),
  ('grc','audit','/audit/:id',            'detail',   'standard', 'audit.record.read',      '{}'),
  ('grc','audit','/audit/new',            'form',     'standard', 'audit.record.write',     '{}'),
  ('grc','audit','/audit/dashboard',      'dashboard','wide',     'audit.report.read',      '{}'),
  ('grc','audit','/audit/settings',       'settings', 'standard', 'audit.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','bcp','/bcp',                'list',     'standard', 'bcp.record.read',      '{}'),
  ('grc','bcp','/bcp/:id',            'detail',   'standard', 'bcp.record.read',      '{}'),
  ('grc','bcp','/bcp/new',            'form',     'standard', 'bcp.record.write',     '{}'),
  ('grc','bcp','/bcp/dashboard',      'dashboard','wide',     'bcp.report.read',      '{}'),
  ('grc','bcp','/bcp/settings',       'settings', 'standard', 'bcp.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','training','/training',                'list',     'standard', 'training.record.read',      '{}'),
  ('grc','training','/training/:id',            'detail',   'standard', 'training.record.read',      '{}'),
  ('grc','training','/training/new',            'form',     'standard', 'training.record.write',     '{}'),
  ('grc','training','/training/dashboard',      'dashboard','wide',     'training.report.read',      '{}'),
  ('grc','training','/training/settings',       'settings', 'standard', 'training.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','reporting','/reporting',                'list',     'standard', 'reporting.record.read',      '{}'),
  ('grc','reporting','/reporting/:id',            'detail',   'standard', 'reporting.record.read',      '{}'),
  ('grc','reporting','/reporting/new',            'form',     'standard', 'reporting.record.write',     '{}'),
  ('grc','reporting','/reporting/dashboard',      'dashboard','wide',     'reporting.report.read',      '{}'),
  ('grc','reporting','/reporting/settings',       'settings', 'standard', 'reporting.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
INSERT INTO dos.ui_route (profile_code, module_code, path, view_kind, layout, required_permission, metadata) VALUES
  ('grc','ai_governance','/ai_governance',                'list',     'standard', 'ai_governance.record.read',      '{}'),
  ('grc','ai_governance','/ai_governance/:id',            'detail',   'standard', 'ai_governance.record.read',      '{}'),
  ('grc','ai_governance','/ai_governance/new',            'form',     'standard', 'ai_governance.record.write',     '{}'),
  ('grc','ai_governance','/ai_governance/dashboard',      'dashboard','wide',     'ai_governance.report.read',      '{}'),
  ('grc','ai_governance','/ai_governance/settings',       'settings', 'standard', 'ai_governance.record.configure', '{}')
ON CONFLICT (profile_code, module_code, path) DO NOTHING;
COMMIT;
