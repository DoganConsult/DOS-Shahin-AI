-- Grant SELECT on dos.delegations view to platform service roles.
-- Without this, /api/governance/delegations returned 500 with PG 42501
-- "permission denied for view delegations" because the view existed but
-- had no privileges granted. Discovered by the M2 (Foundation Overview)
-- DoD harness — see ops/proofs/module-foundation-overview-dod-*.json.
GRANT SELECT ON dos.delegations TO
  dos_user,
  dos_auth,
  dos_gateway,
  dos_tenant,
  dos_audit,
  dos_workflow;

-- Same gap on the underlying platform_dauth.* tables.
GRANT SELECT ON ALL TABLES IN SCHEMA platform_dauth TO
  dos_user,
  dos_auth,
  dos_gateway,
  dos_tenant;
