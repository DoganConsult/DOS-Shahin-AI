-- Backfill ui_workspace_banner for active tenants that have workspace shell
-- bindings but are missing canonical banner rows (e.g. tenant activated or
-- gained bindings after 20260506_0500_workspace_envelope_baseline_seed.sql).
--
-- Idempotent: ON CONFLICT (tenant_id, banner_id) DO NOTHING.

BEGIN;

INSERT INTO dos.ui_workspace_banner
  (tenant_id, banner_id, gate, kind, title_key, title_fallback,
   message_key, message_fallback, action_label_key, action_json,
   dismissible, sort_order, enabled, version)
SELECT s.tenant_id, x.banner_id, x.gate, x.kind, x.title_key, x.title_fallback,
       x.message_key, x.message_fallback, x.action_label_key,
       NULLIF(x.action_json, '')::jsonb, x.dismissible, x.sort_order, true, 1
  FROM (
    SELECT DISTINCT b.tenant_id
      FROM dos.workspace_shell_binding b
      JOIN dos.tenants t ON t.tenant_id = b.tenant_id AND t.status = 'active'
     WHERE b.component_key LIKE 'workspace.%'
  ) s
 CROSS JOIN (VALUES
   ('offline',        'offline',        'warning',
    'shell.banner.offline.title',         'You''re offline',
    'shell.banner.offline.message',       'Some features are unavailable until the connection is restored.',
    NULL::text, '', false, 10),
   ('session-expiry', 'session-expiry', 'warning',
    'shell.banner.session-expiry.title',  'Session about to expire',
    'shell.banner.session-expiry.message','You''ll be signed out shortly. Save your work.',
    NULL::text, '', true,  20),
   ('trial-expired',  'trial-expired',  'danger',
    'shell.banner.trial-expired.title',   'Trial expired',
    'shell.banner.trial-expired.message', 'Upgrade to keep using these modules.',
    NULL::text, '', false, 30)
 ) AS x(banner_id, gate, kind,
        title_key,        title_fallback,
        message_key,      message_fallback,
        action_label_key, action_json, dismissible, sort_order)
ON CONFLICT (tenant_id, banner_id) DO NOTHING;

COMMIT;
