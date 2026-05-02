-- Project permissions for module=governance
BEGIN;
INSERT INTO permissions (code, module_code, verb) VALUES
  ('governance.record.read','governance','record.read'),
  ('governance.record.write','governance','record.write'),
  ('governance.record.approve','governance','record.approve'),
  ('governance.record.manage','governance','record.manage'),
  ('governance.record.delete','governance','record.delete'),
  ('governance.record.configure','governance','record.configure'),
  ('governance.evidence.read','governance','evidence.read'),
  ('governance.evidence.write','governance','evidence.write'),
  ('governance.report.read','governance','report.read'),
  ('governance.export','governance','export');
COMMIT;
