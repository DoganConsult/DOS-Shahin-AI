BEGIN;
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','governance','governance.nav.list',     'list',     '/governance',           1,'governance.record.read'),
  ('grc','governance','governance.nav.dashboard','dashboard','/governance/dashboard', 2,'governance.report.read'),
  ('grc','governance','governance.nav.new',      'plus',     '/governance/new',       3,'governance.record.write'),
  ('grc','governance','governance.nav.settings', 'cog',      '/governance/settings',  9,'governance.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','qiyas','qiyas.nav.list',     'list',     '/qiyas',           1,'qiyas.record.read'),
  ('grc','qiyas','qiyas.nav.dashboard','dashboard','/qiyas/dashboard', 2,'qiyas.report.read'),
  ('grc','qiyas','qiyas.nav.new',      'plus',     '/qiyas/new',       3,'qiyas.record.write'),
  ('grc','qiyas','qiyas.nav.settings', 'cog',      '/qiyas/settings',  9,'qiyas.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','regulatory','regulatory.nav.list',     'list',     '/regulatory',           1,'regulatory.record.read'),
  ('grc','regulatory','regulatory.nav.dashboard','dashboard','/regulatory/dashboard', 2,'regulatory.report.read'),
  ('grc','regulatory','regulatory.nav.new',      'plus',     '/regulatory/new',       3,'regulatory.record.write'),
  ('grc','regulatory','regulatory.nav.settings', 'cog',      '/regulatory/settings',  9,'regulatory.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','compliance','compliance.nav.list',     'list',     '/compliance',           1,'compliance.record.read'),
  ('grc','compliance','compliance.nav.dashboard','dashboard','/compliance/dashboard', 2,'compliance.report.read'),
  ('grc','compliance','compliance.nav.new',      'plus',     '/compliance/new',       3,'compliance.record.write'),
  ('grc','compliance','compliance.nav.settings', 'cog',      '/compliance/settings',  9,'compliance.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','risk','risk.nav.list',     'list',     '/risk',           1,'risk.record.read'),
  ('grc','risk','risk.nav.dashboard','dashboard','/risk/dashboard', 2,'risk.report.read'),
  ('grc','risk','risk.nav.new',      'plus',     '/risk/new',       3,'risk.record.write'),
  ('grc','risk','risk.nav.settings', 'cog',      '/risk/settings',  9,'risk.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','controls','controls.nav.list',     'list',     '/controls',           1,'controls.record.read'),
  ('grc','controls','controls.nav.dashboard','dashboard','/controls/dashboard', 2,'controls.report.read'),
  ('grc','controls','controls.nav.new',      'plus',     '/controls/new',       3,'controls.record.write'),
  ('grc','controls','controls.nav.settings', 'cog',      '/controls/settings',  9,'controls.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','policy','policy.nav.list',     'list',     '/policy',           1,'policy.record.read'),
  ('grc','policy','policy.nav.dashboard','dashboard','/policy/dashboard', 2,'policy.report.read'),
  ('grc','policy','policy.nav.new',      'plus',     '/policy/new',       3,'policy.record.write'),
  ('grc','policy','policy.nav.settings', 'cog',      '/policy/settings',  9,'policy.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','asset','asset.nav.list',     'list',     '/asset',           1,'asset.record.read'),
  ('grc','asset','asset.nav.dashboard','dashboard','/asset/dashboard', 2,'asset.report.read'),
  ('grc','asset','asset.nav.new',      'plus',     '/asset/new',       3,'asset.record.write'),
  ('grc','asset','asset.nav.settings', 'cog',      '/asset/settings',  9,'asset.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','vendor','vendor.nav.list',     'list',     '/vendor',           1,'vendor.record.read'),
  ('grc','vendor','vendor.nav.dashboard','dashboard','/vendor/dashboard', 2,'vendor.report.read'),
  ('grc','vendor','vendor.nav.new',      'plus',     '/vendor/new',       3,'vendor.record.write'),
  ('grc','vendor','vendor.nav.settings', 'cog',      '/vendor/settings',  9,'vendor.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','incident','incident.nav.list',     'list',     '/incident',           1,'incident.record.read'),
  ('grc','incident','incident.nav.dashboard','dashboard','/incident/dashboard', 2,'incident.report.read'),
  ('grc','incident','incident.nav.new',      'plus',     '/incident/new',       3,'incident.record.write'),
  ('grc','incident','incident.nav.settings', 'cog',      '/incident/settings',  9,'incident.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','exceptions','exceptions.nav.list',     'list',     '/exceptions',           1,'exceptions.record.read'),
  ('grc','exceptions','exceptions.nav.dashboard','dashboard','/exceptions/dashboard', 2,'exceptions.report.read'),
  ('grc','exceptions','exceptions.nav.new',      'plus',     '/exceptions/new',       3,'exceptions.record.write'),
  ('grc','exceptions','exceptions.nav.settings', 'cog',      '/exceptions/settings',  9,'exceptions.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','issues','issues.nav.list',     'list',     '/issues',           1,'issues.record.read'),
  ('grc','issues','issues.nav.dashboard','dashboard','/issues/dashboard', 2,'issues.report.read'),
  ('grc','issues','issues.nav.new',      'plus',     '/issues/new',       3,'issues.record.write'),
  ('grc','issues','issues.nav.settings', 'cog',      '/issues/settings',  9,'issues.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','evidence','evidence.nav.list',     'list',     '/evidence',           1,'evidence.record.read'),
  ('grc','evidence','evidence.nav.dashboard','dashboard','/evidence/dashboard', 2,'evidence.report.read'),
  ('grc','evidence','evidence.nav.new',      'plus',     '/evidence/new',       3,'evidence.record.write'),
  ('grc','evidence','evidence.nav.settings', 'cog',      '/evidence/settings',  9,'evidence.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','audit','audit.nav.list',     'list',     '/audit',           1,'audit.record.read'),
  ('grc','audit','audit.nav.dashboard','dashboard','/audit/dashboard', 2,'audit.report.read'),
  ('grc','audit','audit.nav.new',      'plus',     '/audit/new',       3,'audit.record.write'),
  ('grc','audit','audit.nav.settings', 'cog',      '/audit/settings',  9,'audit.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','bcp','bcp.nav.list',     'list',     '/bcp',           1,'bcp.record.read'),
  ('grc','bcp','bcp.nav.dashboard','dashboard','/bcp/dashboard', 2,'bcp.report.read'),
  ('grc','bcp','bcp.nav.new',      'plus',     '/bcp/new',       3,'bcp.record.write'),
  ('grc','bcp','bcp.nav.settings', 'cog',      '/bcp/settings',  9,'bcp.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','training','training.nav.list',     'list',     '/training',           1,'training.record.read'),
  ('grc','training','training.nav.dashboard','dashboard','/training/dashboard', 2,'training.report.read'),
  ('grc','training','training.nav.new',      'plus',     '/training/new',       3,'training.record.write'),
  ('grc','training','training.nav.settings', 'cog',      '/training/settings',  9,'training.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','reporting','reporting.nav.list',     'list',     '/reporting',           1,'reporting.record.read'),
  ('grc','reporting','reporting.nav.dashboard','dashboard','/reporting/dashboard', 2,'reporting.report.read'),
  ('grc','reporting','reporting.nav.new',      'plus',     '/reporting/new',       3,'reporting.record.write'),
  ('grc','reporting','reporting.nav.settings', 'cog',      '/reporting/settings',  9,'reporting.record.configure');
INSERT INTO dos.ui_navigation (profile_code, module_code, label_token, icon, route_path, position, required_permission) VALUES
  ('grc','ai_governance','ai_governance.nav.list',     'list',     '/ai_governance',           1,'ai_governance.record.read'),
  ('grc','ai_governance','ai_governance.nav.dashboard','dashboard','/ai_governance/dashboard', 2,'ai_governance.report.read'),
  ('grc','ai_governance','ai_governance.nav.new',      'plus',     '/ai_governance/new',       3,'ai_governance.record.write'),
  ('grc','ai_governance','ai_governance.nav.settings', 'cog',      '/ai_governance/settings',  9,'ai_governance.record.configure');
COMMIT;
