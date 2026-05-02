# Module: `agrc-engine`

**Owner service:** `ai-gateway-service` -- **Tables:** 20 -- **Has-data:** 6 -- **Schema-only:** 14

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `activity_stream` | 9 | Agrc Engine -- Activity Stream | N |  |
| 2 | `agent_handoffs` | 10 | Agrc Engine -- AI agent record (Agent Handoffs) | T |  |
| 3 | `agrc_engine_dedup` | 6 | Agrc Engine -- Agrc Engine Dedup | N |  |
| 4 | `agrc_engine_runs` | 16 | Agrc Engine -- Agrc Engine: Execution run records | P |  |
| 5 | `assessment_items` | 7 | Agrc Engine -- Assessment Items | N |  |
| 6 | `bcp_plans` | 18 | Agrc Engine -- Bcp Plans | N |  |
| 7 | `channels` | 5 | Agrc Engine -- Channels | N |  |
| 8 | `controls` | 53 | Agrc Engine -- Control record (Controls) | T |  |
| 9 | `drawer_templates` | 9 | Agrc Engine -- Drawer: Template catalog | P | ✓ |
| 10 | `evidence` | 63 | Agrc Engine -- Evidence | N |  |
| 11 | `evidence_team_distribution` | 7 | Agrc Engine -- Team record (Evidence Team Distribution) | T | ✓ |
| 12 | `framework_requirements` | 16 | Agrc Engine -- Framework definition (Framework Requirements) | T |  |
| 13 | `gate_definitions` | 22 | Agrc Engine -- Gate: Definition catalog | P | ✓ |
| 14 | `gate_validation_rules` | 12 | Agrc Engine -- Gate Validation: Rules/policy definitions | P |  |
| 15 | `grc_raci_assignments` | 15 | Agrc Engine -- Grc Raci: Assignment mapping (X to Y) | P |  |
| 16 | `member_agent_shadows` | 18 | Agrc Engine -- AI agent record (Member Agent Shadows) | T |  |
| 17 | `mode_operation_log` | 14 | Agrc Engine -- Mode Operation: Activity/audit log records | P |  |
| 18 | `notifications` | 10 | Agrc Engine -- Notifications | N | ✓ |
| 19 | `policies` | 47 | Agrc Engine -- Policies | N | ✓ |
| 20 | `raci_matrix` | 20 | Agrc Engine -- RACI/permission matrix (Raci Matrix) | T | ✓ |
