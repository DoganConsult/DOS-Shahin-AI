-- AI-OS Wave 1.4 — Seed minimal allow-list of tool permissions for A01
-- (Onboarding Agent) on the canonical pilot tenant. Idempotent: reruns
-- replace existing rows on the (tenant_id, agent_id, tool_name, action)
-- triple via a synthetic uniqueness check.
--
-- Tenant id resolution: prefer the canonical pilot tenant when present,
-- otherwise grant against every active tenant in public.tenants. This is
-- the W1.4 ground-truth seed used by the smoke harness.

DO $$
DECLARE
  pilot_tenant uuid;
  rec RECORD;
  tools text[] := ARRAY[
    'foundation.read',
    'tenant.read',
    'workspace.read',
    'organization.read',
    'identity.read',
    'permission.read'
  ];
  t text;
BEGIN
  -- 1. Resolve a pilot tenant. Prefer the canonical 2ba4b53… UUID, then
  --    fall back to whatever active tenant exists.
  SELECT tenant_id INTO pilot_tenant
    FROM public.tenants
   WHERE tenant_id::text = '2ba4b532-3361-413c-ac6c-9c992f66bec4'
   LIMIT 1;

  IF pilot_tenant IS NULL THEN
    SELECT tenant_id INTO pilot_tenant
      FROM public.tenants
     WHERE COALESCE(status, 'active') IN ('active','provisioned','live','ga')
     ORDER BY created_at NULLS LAST
     LIMIT 1;
  END IF;

  IF pilot_tenant IS NULL THEN
    RAISE NOTICE '[531] No tenant rows found — skipping tool-perm seed.';
    RETURN;
  END IF;

  -- 2. Idempotent seed for A01 read-only foundation tools.
  FOREACH t IN ARRAY tools LOOP
    -- Soft-revoke prior row to avoid stale grants accumulating.
    UPDATE public.agent_tool_permissions
       SET active = FALSE, revoked_at = NOW()
     WHERE tenant_id = pilot_tenant
       AND agent_id  = 'A01'
       AND tool_name = t
       AND action    = 'invoke'
       AND active    = TRUE;

    INSERT INTO public.agent_tool_permissions (
      tenant_id, agent_id, tool_name, action, level, conditions, granted_by, notes
    )
    VALUES (
      pilot_tenant, 'A01', t, 'invoke', 'allow',
      jsonb_build_object('source','530-bootstrap','wave','1.4','readOnly', TRUE),
      NULL, 'A01 Wave 1.4 baseline grant'
    );
  END LOOP;

  -- 3. Higher-impact write actions require human approval (HITL).
  FOR rec IN SELECT unnest(ARRAY[
    'organization.write','user.invite','permission.assign'
  ]) AS tool LOOP
    UPDATE public.agent_tool_permissions
       SET active = FALSE, revoked_at = NOW()
     WHERE tenant_id = pilot_tenant
       AND agent_id  = 'A01'
       AND tool_name = rec.tool
       AND action    = 'invoke'
       AND active    = TRUE;

    INSERT INTO public.agent_tool_permissions (
      tenant_id, agent_id, tool_name, action, level, conditions, granted_by, notes
    )
    VALUES (
      pilot_tenant, 'A01', rec.tool, 'invoke', 'approval_required',
      jsonb_build_object('source','530-bootstrap','wave','1.4','hitl', TRUE),
      NULL, 'A01 Wave 1.4 approval-gated write'
    );
  END LOOP;

  RAISE NOTICE '[531] Seeded A01 tool permissions for tenant %', pilot_tenant;
END$$;
