BEGIN;
INSERT INTO dos.module_registry
  (profile_code, module_code, tier, product_key, card_position, entitlement_key, feature_flag, enabled, metadata)
VALUES
  ('grc','governance','module','shahin-ai',1,'module.governance','module.governance.enabled',TRUE,
   jsonb_build_object('name','Governance & Authority'))
ON CONFLICT (profile_code, module_code) DO UPDATE
  SET tier=EXCLUDED.tier, card_position=EXCLUDED.card_position, enabled=EXCLUDED.enabled;

UPDATE dos.ui_module SET tier='module' WHERE profile_code='grc' AND code='governance';
COMMIT;
