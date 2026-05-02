BEGIN;
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='governance' AND view_code='governance_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:governance_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='qiyas' AND view_code='qiyas_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:qiyas_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='regulatory' AND view_code='regulatory_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:regulatory_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='compliance' AND view_code='compliance_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:compliance_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='risk' AND view_code='risk_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:risk_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='controls' AND view_code='controls_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:controls_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='policy' AND view_code='policy_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:policy_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='asset' AND view_code='asset_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:asset_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='vendor' AND view_code='vendor_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:vendor_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='incident' AND view_code='incident_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:incident_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='exceptions' AND view_code='exceptions_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:exceptions_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='issues' AND view_code='issues_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:issues_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='evidence' AND view_code='evidence_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:evidence_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='audit' AND view_code='audit_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:audit_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='bcp' AND view_code='bcp_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:bcp_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='training' AND view_code='training_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:training_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='reporting' AND view_code='reporting_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:reporting_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
WITH v AS (SELECT id FROM dos.ui_view WHERE profile_code='grc' AND module_code='ai_governance' AND view_code='ai_governance_list')
INSERT INTO dos.ui_filter (profile_code, view_id, field, operator, control, options_source, default_value, position) VALUES
  ('grc',(SELECT id FROM v),'state',         'in',     'select','enum:ai_governance_state','[]'::jsonb,1),
  ('grc',(SELECT id FROM v),'owner_user_id', 'eq',     'select','lookup:user',       'null'::jsonb,2),
  ('grc',(SELECT id FROM v),'scope_level',   'in',     'select','enum:scope',        '[]'::jsonb,3),
  ('grc',(SELECT id FROM v),'updated_at',    'between','date',  NULL,                'null'::jsonb,4);
COMMIT;
