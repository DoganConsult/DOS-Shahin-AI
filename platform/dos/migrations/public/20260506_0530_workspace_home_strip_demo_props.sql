-- 20260506_0530_workspace_home_strip_demo_props.sql
-- Forward-only. Strips placeholder/demo content from the live
-- /workspace-home template-binding row and the product-level demo
-- override that was shipped by:
--   - 20260505_0300_workspace_home_command_home.sql
--   - 20260505_0301_workspace_home_pillars.sql
--   - 20260505_0410_workspace_home_layered_demo.sql
--
-- Symptom: ShellHost rendered hardcoded "47 risk records",
-- "SAMA cyber rule 4.2 deadline", "Review at-risk obligation",
-- "compliance score up 2 pts", "AI model v2.1" cards for every
-- authenticated tenant — none of which is real tenant data.
--
-- Fix: replace the demo `props` blob with `'{}'::jsonb`. The
-- masthead title/subtitle columns are kept (they are legitimate
-- chrome strings — "Workspace home"/"Home" are not demo data).
-- The command-home renderer iterates over `kpis`, `nbaActions`,
-- `pillars`, `tabs` — each is wrapped in @if so an empty props
-- yields a controlled empty state (masthead + 5-pillar empty bar)
-- rather than fabricated GRC numbers.
--
-- Also clears the product-level shahin-ai override that injected
-- "47 risk records" into pillars.evidence.
--
-- Idempotent.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = '{}'::jsonb,
       version = version + 1
 WHERE route = '/workspace-home';

UPDATE dos.ui_override_product
   SET patch = patch - 'pillars',
       version = version + 1
 WHERE product_code = 'shahin-ai'
   AND patch ? 'pillars';

COMMIT;
