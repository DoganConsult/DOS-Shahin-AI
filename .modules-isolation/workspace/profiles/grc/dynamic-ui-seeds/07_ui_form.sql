BEGIN;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','governance','governance_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'governance.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','qiyas','qiyas_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'qiyas.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','regulatory','regulatory_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'regulatory.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','compliance','compliance_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'compliance.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','risk','risk_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'risk.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','controls','controls_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'controls.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','policy','policy_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'policy.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','asset','asset_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'asset.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','vendor','vendor_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'vendor.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','incident','incident_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'incident.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','exceptions','exceptions_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'exceptions.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','issues','issues_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'issues.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','evidence','evidence_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'evidence.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','audit','audit_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'audit.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','bcp','bcp_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'bcp.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','training','training_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'training.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','reporting','reporting_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'reporting.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
INSERT INTO dos.ui_form (profile_code, module_code, form_code, schema_json, ui_schema_json, required_permission) VALUES
  ('grc','ai_governance','ai_governance_main',
   '{"type":"object","required":["title","scope_level"],"properties":{"title":{"type":"string"},"description":{"type":"string"},"scope_level":{"enum":["org","business_unit","department","team","position","own"]},"owner_user_id":{"type":"string","format":"uuid"},"accountable_user_id":{"type":"string","format":"uuid"}}}'::jsonb,
   '{"type":"VerticalLayout","elements":[{"type":"Control","scope":"#/properties/title"},{"type":"Control","scope":"#/properties/description","options":{"multi":true}},{"type":"HorizontalLayout","elements":[{"type":"Control","scope":"#/properties/scope_level"},{"type":"Control","scope":"#/properties/owner_user_id","options":{"control":"user-picker"}},{"type":"Control","scope":"#/properties/accountable_user_id","options":{"control":"user-picker"}}]}]}'::jsonb,
   'ai_governance.record.write')
ON CONFLICT (profile_code, module_code, form_code) DO NOTHING;
COMMIT;
