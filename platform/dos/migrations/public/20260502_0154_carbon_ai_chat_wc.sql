-- 0154 — Reclassify @carbon/ai-chat as runtime web components.
--
-- Correction: 0150 misclassified Carbon AI Chat as 'unavailable /
-- missing-upstream-angular-binding'. Per the upstream docs, the package
-- ships exactly two runtime web components:
--   - <cds-aichat-container>          — full chat shell
--   - <cds-aichat-custom-element>     — embeddable custom element
-- Both are framework-agnostic web components consumable from Angular via
-- a custom-element bridge per rule #5.
--
-- 0150 seeded 3 incorrect rows (ai.chat-shell, ai.chat-message-list,
-- ai.chat-input) classified as 'unavailable'. This migration deletes
-- those and replaces them with the 2 canonical web-component rows.
-- =====================================================================
BEGIN;

-- Delete the 3 stale unavailable rows from 0150.
DELETE FROM dos.ui_carbon_components
 WHERE carbon_key IN ('ai.chat-shell', 'ai.chat-message-list', 'ai.chat-input');

INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('aichat.container', '@carbon/ai-chat', '0.x', 'cds-aichat-container',
     'ai', FALSE, TRUE,
     'web-component-wrapper', 'wrapper-required', FALSE, TRUE,
     'stable', FALSE,
     'Full Carbon AI Chat shell. Consume via Angular custom-element bridge wrapper (DosCarbonAiChatContainer). dynamic_ui_allowed flips TRUE once wrapper + props schema land.'),
  ('aichat.custom-element', '@carbon/ai-chat', '0.x', 'cds-aichat-custom-element',
     'ai', FALSE, TRUE,
     'web-component-wrapper', 'wrapper-required', FALSE, TRUE,
     'stable', FALSE,
     'Embeddable custom-element variant of Carbon AI Chat. Consume via Angular custom-element bridge wrapper (DosCarbonAiChatCustomElement).')
ON CONFLICT (carbon_key) DO UPDATE
  SET package_name        = EXCLUDED.package_name,
      package_version     = EXCLUDED.package_version,
      source_component_name = EXCLUDED.source_component_name,
      category            = EXCLUDED.category,
      integration_mode    = EXCLUDED.integration_mode,
      runtime_status      = EXCLUDED.runtime_status,
      angular_native      = EXCLUDED.angular_native,
      wrapper_required    = EXCLUDED.wrapper_required,
      stability           = EXCLUDED.stability,
      dynamic_ui_allowed  = EXCLUDED.dynamic_ui_allowed,
      notes               = EXCLUDED.notes,
      is_active           = TRUE;

DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_carbon_components WHERE package_name='@carbon/ai-chat';
  IF n <> 2 THEN
    RAISE EXCEPTION '0154: @carbon/ai-chat catalog drift — got %, want exactly 2 (container + custom-element)', n;
  END IF;
  RAISE NOTICE 'OK — @carbon/ai-chat = 2 (cds-aichat-container, cds-aichat-custom-element)';
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0154_carbon_ai_chat_wc.sql', 'inline-0154', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations WHERE filename = '20260502_0154_carbon_ai_chat_wc.sql'
 );

COMMIT;
