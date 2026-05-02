# Module: `bcp`

**Owner service:** `risk-incident-service` -- **Tables:** 22 -- **Has-data:** 3 -- **Schema-only:** 19

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `bcm_audit_log` | 11 | Bcp -- Bcm Audit: Activity/audit log records | P |  |
| 2 | `bcm_dependency_edges` | 9 | Bcp -- Bcm Dependency Edges | N |  |
| 3 | `bcm_dependency_maps` | 11 | Bcp -- Bcm Dependency Maps | N |  |
| 4 | `bcm_dependency_nodes` | 14 | Bcp -- Bcm Dependency Nodes | N |  |
| 5 | `bcm_findings` | 24 | Bcp -- Bcm: Finding records | P |  |
| 6 | `bcm_maturity_assessments` | 21 | Bcp -- Bcm Maturity Assessments | N |  |
| 7 | `bcm_recovery_strategies` | 24 | Bcp -- Bcm Recovery Strategies | N | ✓ |
| 8 | `bcp_activations` | 23 | Bcp -- Bcp Activations | N |  |
| 9 | `bcp_bia_templates` | 10 | Bcp -- Bcp Bia: Template catalog | P |  |
| 10 | `bcp_crisis_teams` | 9 | Bcp -- Team record (Bcp Crisis Teams) | T |  |
| 11 | `bcp_exercise_results` | 13 | Bcp -- Bcp Exercise Results | N |  |
| 12 | `bcp_exercise_schedule` | 13 | Bcp -- Bcp Exercise Schedule | N |  |
| 13 | `bcp_exercises` | 34 | Bcp -- Bcp Exercises | N |  |
| 14 | `bcp_recovery_step_tracking` | 17 | Bcp -- Bcp Recovery Step Tracking | N |  |
| 15 | `bcp_rto_rpo_defaults` | 9 | Bcp -- Bcp Rto Rpo Defaults | N |  |
| 16 | `bcp_team_distribution` | 6 | Bcp -- Team record (Bcp Team Distribution) | T | ✓ |
| 17 | `bia_assessments` | 30 | Bcp -- Bia Assessments | N |  |
| 18 | `bia_process_impacts` | 22 | Bcp -- Bia Process Impacts | N |  |
| 19 | `crisis_comm_activations` | 13 | Bcp -- Crisis Comm Activations | N |  |
| 20 | `crisis_comm_plans` | 26 | Bcp -- Crisis Comm Plans | N | ✓ |
| 21 | `crisis_events` | 26 | Bcp -- Crisis: Domain event records | P |  |
| 22 | `crisis_notification_tree` | 13 | Bcp -- Crisis Notification Tree | N |  |
