# Shahin-AI Module Registration Matrix

Activation rule for business sidebar modules: a module is active only when all gates pass: published status, route exists, nav row exists, dynamic rows exist, pages exist, valid 3-segment permissions, roles mapped, explicit bindings where required, DB tables verified, Carbon verify pass, tenant entitlement exists.

| order | module_code | nav_group | nav_label | business_sidebar | admin_only | current_state |
|---:|---|---|---|---|---|---|
| 1 | `foundation` | Foundation | Foundation | yes | no | active |
| 2 | `risk` | GRC Core | Risk | yes | no | active (publisher-controlled) |
| 3 | `compliance` | GRC Core | Compliance | yes | no | gated/hidden |
| 4 | `controls` | GRC Core | Controls | yes | no | gated/hidden |
| 5 | `policy` | GRC Core | Policy | yes | no | gated/hidden |
| 6 | `audit` | GRC Core | Audit | yes | no | gated/hidden |
| 7 | `evidence` | GRC Core | Evidence | yes | no | gated/hidden |
| 8 | `issues` | GRC Core | Issues | yes | no | gated/hidden |
| 9 | `remediation` | GRC Core | Remediation | yes | no | gated/hidden |
| 10 | `incident` | Operational Risk | Incidents | yes | no | gated/hidden |
| 11 | `vendor` | Operational Risk | Vendor Risk | yes | no | gated/hidden |
| 12 | `asset` | Operational Risk | Assets | yes | no | gated/hidden |
| 13 | `privacy` | Operational Risk | Privacy | yes | no | gated/hidden |
| 14 | `bcp` | Operational Risk | Business Continuity | yes | no | gated/hidden |
| 15 | `dora` | Operational Risk | Digital Resilience | yes | no | gated/hidden |
| 16 | `ksa-regulatory` | Operational Risk | KSA Regulatory | yes | no | gated/hidden |
| 17 | `qiyas` | Operational Risk | Qiyas | yes | no | gated/hidden |
| 18 | `attestation` | Assurance & Work | Attestations | yes | no | gated/hidden |
| 19 | `training` | Assurance & Work | Training | yes | no | gated/hidden |
| 20 | `reporting` | Assurance & Work | Reporting | yes | no | gated/hidden |
| 21 | `analytics` | Assurance & Work | Analytics | yes | no | gated/hidden |
| 22 | `workflow` | Assurance & Work | Workflows | yes | no | gated/hidden |
| 23 | `action` | Assurance & Work | Actions | yes | no | gated/hidden |
| 24 | `inbox` | Assurance & Work | Inbox | yes | no | gated/hidden |
| 25 | `knowledge` | Assurance & Work | Knowledge | yes | no | gated/hidden |
| 26 | `ai-platform` | AI / Intelligence | AI Platform | yes | no | gated/hidden |
| 27 | `ai-os` | AI / Intelligence | AI OS | yes | no | gated/hidden |
| 28 | `agrc-engine` | AI / Intelligence | AGRC Engine | yes | no | gated/hidden |
| - | `config-center` | Admin / Platform | Config Center | no | yes | admin-only |
| - | `dynamic-ui` | Admin / Platform | Dynamic UI | no | yes | admin-only |
| - | `notification` | Admin / Platform | Notifications | no | yes | admin-only |
| - | `workspace-shell` | Admin / Platform | Workspace Shell | no | yes | admin-only |
| - | `mcp` | Admin / Platform | MCP | no | yes | admin-only |
| - | `onboarding` | Admin / Platform | Onboarding | no | yes | admin-only |
