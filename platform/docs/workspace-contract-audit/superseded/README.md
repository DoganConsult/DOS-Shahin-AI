# Superseded workspace-contract-audit reports

These snapshots were produced by the v1 harness, which:

- selected tenant non-deterministically (`LIMIT 1` without `ORDER BY`)
- silently downgraded any non-2xx runtime response to "Runtime Available: No"
- always-pushed two failure rows (`shell-host-branching`,
  `workspace-home-template-binding`) with no evidence collection
- mis-counted set differences via plain subtraction (e.g. `-7`)
- treated `null` COMPONENT_MAP values as visual map hits
- exposed DOM/visible columns hardcoded to `0` / `false`

They MUST NOT be used as a release/contract gate.
The canonical report is the v2 file at
`../workspace-contract-audit.{md,json}` produced by
`scripts/audits/workspace-contract-audit.mjs`.
