# Module: `onboarding`

**Owner service:** `onboarding-service` -- **Tables:** 34 -- **Has-data:** 6 -- **Schema-only:** 28

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `access_review_campaigns` | 13 | Onboarding -- Campaign record (Access Review Campaigns) | T |  |
| 2 | `dashboard_configs` | 18 | Onboarding -- Dashboard Configs | N |  |
| 3 | `governance_committees` | 6 | Onboarding -- Committee record (Governance Committees) | T |  |
| 4 | `governance_context` | 12 | Onboarding -- Governance Context | N |  |
| 5 | `journey_certifications` | 10 | Onboarding -- Journey Certifications | N | ✓ |
| 6 | `journey_maturity_snapshots` | 9 | Onboarding -- Journey Maturity: Point-in-time snapshots | P |  |
| 7 | `journey_milestones` | 18 | Onboarding -- Journey Milestones | N |  |
| 8 | `journey_phases` | 20 | Onboarding -- Journey Phases | N |  |
| 9 | `journey_progress` | 12 | Onboarding -- Journey Progress | N |  |
| 10 | `journey_roadmaps` | 22 | Onboarding -- Journey Roadmaps | N |  |
| 11 | `module_assignments` | 20 | Onboarding -- Module: Assignment mapping (X to Y) | P |  |
| 12 | `onboarding_answers` | 8 | Onboarding -- Onboarding Answers | N |  |
| 13 | `onboarding_assessment_drafts` | 15 | Onboarding -- Onboarding Assessment: Draft records (pre-publish) | P |  |
| 14 | `onboarding_consensus` | 9 | Onboarding -- Onboarding Consensus | N |  |
| 15 | `onboarding_questions` | 11 | Onboarding -- Onboarding: Question catalog | P |  |
| 16 | `onboarding_seed_history` | 6 | Onboarding -- Onboarding Seed: Historical change records | P |  |
| 17 | `onboarding_stages` | 10 | Stage configuration | R |  |
| 18 | `os_playbook_versions` | 11 | Onboarding -- Os Playbook: Versioned record history | P |  |
| 19 | `person_profiles` | 15 | Onboarding -- Person Profiles | N |  |
| 20 | `plan_item_instances` | 12 | Onboarding -- Plan Item Instances | N |  |
| 21 | `qiyas_benchmark_profiles` | 11 | Onboarding -- Qiyas Benchmark Profiles | N |  |
| 22 | `qiyas_rating_scales` | 10 | Onboarding -- Qiyas Rating Scales | N |  |
| 23 | `qiyas_scoring_methods` | 9 | Onboarding -- Qiyas Scoring Methods | N |  |
| 24 | `raci_matrices` | 6 | Onboarding -- Raci Matrices | N |  |
| 25 | `regulatory_requirements` | 17 | Onboarding -- Regulatory Requirements | N |  |
| 26 | `risk_appetite_config` | 13 | Onboarding -- Risk Appetite: Configuration values | P |  |
| 27 | `risk_tolerance_bands` | 11 | Onboarding -- Risk record (Risk Tolerance Bands) | T |  |
| 28 | `role_profiles` | 11 | Onboarding -- Role record (Role Profiles) | T | ✓ |
| 29 | `scope_dimensions` | 6 | Onboarding -- Scope Dimensions | N |  |
| 30 | `sla_config` | 33 | Onboarding -- Sla: Configuration values | P | ✓ |
| 31 | `sod_conflict_matrix` | 13 | Onboarding -- RACI/permission matrix (Sod Conflict Matrix) | T | ✓ |
| 32 | `team_escalation_paths` | 6 | Onboarding -- Team record (Team Escalation Paths) | T | ✓ |
| 33 | `user_role_assignments` | 19 | Onboarding -- User Role: Assignment mapping (X to Y) | P |  |
| 34 | `workspaces` | 5 | Onboarding -- Workspace record (Workspaces) | T | ✓ |
