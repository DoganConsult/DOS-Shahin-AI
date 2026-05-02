# Module: `qiyas`

**Owner service:** `compliance-controls-service` -- **Tables:** 72 -- **Has-data:** 2 -- **Schema-only:** 70

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `enterprise_priorities` | 13 | Qiyas -- Enterprise Priorities | N |  |
| 2 | `executive_kpis` | 36 | Qiyas -- Executive: KPI definitions/data | P | ✓ |
| 3 | `metric_snapshots` | 12 | Qiyas -- Metric: Point-in-time snapshots | P |  |
| 4 | `qiyas_assessment_exports` | 11 | Qiyas -- Qiyas Assessment Exports | N |  |
| 5 | `qiyas_assessment_respondents` | 12 | Qiyas -- Qiyas Assessment Respondents | N |  |
| 6 | `qiyas_assessment_reviews` | 11 | Qiyas -- Qiyas Assessment Reviews | N |  |
| 7 | `qiyas_assessment_scopes` | 7 | Qiyas -- Qiyas Assessment Scopes | N |  |
| 8 | `qiyas_assessment_status_history` | 8 | Qiyas -- Qiyas Assessment Status: Historical change records | P |  |
| 9 | `qiyas_assessments` | 18 | Qiyas -- Qiyas Assessments | N |  |
| 10 | `qiyas_auto_tasks` | 17 | Qiyas -- Qiyas Auto: Task records | P |  |
| 11 | `qiyas_benchmark_cohorts` | 12 | Qiyas -- Qiyas Benchmark Cohorts | N |  |
| 12 | `qiyas_benchmark_comparisons` | 13 | Qiyas -- Qiyas Benchmark Comparisons | N |  |
| 13 | `qiyas_benchmark_datasets` | 19 | Qiyas -- Qiyas Benchmark Datasets | N |  |
| 14 | `qiyas_benchmark_metrics` | 16 | Qiyas -- Qiyas Benchmark: Metric data points | P |  |
| 15 | `qiyas_benchmark_percentiles` | 8 | Qiyas -- Qiyas Benchmark Percentiles | N |  |
| 16 | `qiyas_benchmark_results` | 11 | Qiyas -- Qiyas Benchmark Results | N |  |
| 17 | `qiyas_benchmark_trends` | 13 | Qiyas -- Qiyas Benchmark Trends | N |  |
| 18 | `qiyas_calibration_log` | 9 | Qiyas -- Qiyas Calibration: Activity/audit log records | P |  |
| 19 | `qiyas_certification_action_plans` | 18 | Qiyas -- Qiyas Certification Action Plans | N |  |
| 20 | `qiyas_certification_evidence_packs` | 18 | Qiyas -- Qiyas Certification Evidence Packs | N |  |
| 21 | `qiyas_certification_gaps` | 14 | Qiyas -- Qiyas Certification Gaps | N |  |
| 22 | `qiyas_certification_milestones` | 14 | Qiyas -- Qiyas Certification Milestones | N |  |
| 23 | `qiyas_certification_readiness` | 16 | Qiyas -- Qiyas Certification Readiness | N |  |
| 24 | `qiyas_certification_simulations` | 12 | Qiyas -- Qiyas Certification Simulations | N |  |
| 25 | `qiyas_consensus_reviews` | 11 | Qiyas -- Qiyas Consensus Reviews | N |  |
| 26 | `qiyas_dimension_scores` | 11 | Qiyas -- Qiyas Dimension Scores | N |  |
| 27 | `qiyas_dimensions` | 10 | Qiyas -- Qiyas Dimensions | N |  |
| 28 | `qiyas_domains` | 11 | Qiyas -- Qiyas Domains | N |  |
| 29 | `qiyas_evidence_chain_validations` | 11 | Qiyas -- Qiyas Evidence Chain Validations | N |  |
| 30 | `qiyas_evidence_coverage_analysis` | 10 | Qiyas -- Qiyas Evidence Coverage Analysis | N |  |
| 31 | `qiyas_evidence_quality_metrics` | 14 | Qiyas -- Qiyas Evidence Quality: Metric data points | P |  |
| 32 | `qiyas_evidence_rules` | 9 | Qiyas -- Qiyas Evidence: Rules/policy definitions | P |  |
| 33 | `qiyas_evidence_scores` | 13 | Qiyas -- Qiyas Evidence Scores | N |  |
| 34 | `qiyas_evidence_scoring_criteria` | 12 | Qiyas -- Qiyas Evidence Scoring Criteria | N |  |
| 35 | `qiyas_evidence_scoring_models` | 12 | Qiyas -- Qiyas Evidence Scoring Models | N |  |
| 36 | `qiyas_evidence_sufficiency_rules` | 11 | Qiyas -- Qiyas Evidence Sufficiency: Rules/policy definitions | P |  |
| 37 | `qiyas_gap_scores` | 10 | Qiyas -- Qiyas Gap Scores | N |  |
| 38 | `qiyas_grc_automation_rules` | 10 | Qiyas -- Qiyas Grc Automation: Rules/policy definitions | P | ✓ |
| 39 | `qiyas_grc_trigger_log` | 14 | Qiyas -- Qiyas Grc Trigger: Activity/audit log records | P |  |
| 40 | `qiyas_improvement_paths` | 13 | Qiyas -- Qiyas Improvement Paths | N |  |
| 41 | `qiyas_indicator_scores` | 10 | Qiyas -- Qiyas Indicator Scores | N |  |
| 42 | `qiyas_indicators` | 13 | Qiyas -- Qiyas Indicators | N |  |
| 43 | `qiyas_maturity_assessments` | 15 | Qiyas -- Qiyas Maturity Assessments | N |  |
| 44 | `qiyas_maturity_dimension_results` | 10 | Qiyas -- Qiyas Maturity Dimension Results | N |  |
| 45 | `qiyas_maturity_level_criteria` | 9 | Qiyas -- Qiyas Maturity Level Criteria | N |  |
| 46 | `qiyas_maturity_levels` | 9 | Qiyas -- Qiyas Maturity Levels | N |  |
| 47 | `qiyas_maturity_models` | 12 | Qiyas -- Qiyas Maturity Models | N |  |
| 48 | `qiyas_maturity_progression_history` | 10 | Qiyas -- Qiyas Maturity Progression: Historical change records | P |  |
| 49 | `qiyas_maturity_roadmaps` | 14 | Qiyas -- Qiyas Maturity Roadmaps | N |  |
| 50 | `qiyas_maturity_scores` | 10 | Qiyas -- Qiyas Maturity Scores | N |  |
| 51 | `qiyas_maturity_target_profiles` | 13 | Qiyas -- Qiyas Maturity Target Profiles | N |  |
| 52 | `qiyas_model_versions` | 10 | Qiyas -- Qiyas Model: Versioned record history | P |  |
| 53 | `qiyas_models` | 13 | Qiyas -- Qiyas Models | N |  |
| 54 | `qiyas_question_mappings` | 6 | Qiyas -- Qiyas Question: Cross-entity mapping | P |  |
| 55 | `qiyas_question_options` | 9 | Qiyas -- Qiyas Question Options | N |  |
| 56 | `qiyas_question_weights` | 7 | Qiyas -- Qiyas Question Weights | N |  |
| 57 | `qiyas_questions` | 14 | Qiyas -- Qiyas: Question catalog | P |  |
| 58 | `qiyas_recommendation_mappings` | 6 | Qiyas -- Qiyas Recommendation: Cross-entity mapping | P |  |
| 59 | `qiyas_recommendations` | 21 | Qiyas -- Qiyas Recommendations | N |  |
| 60 | `qiyas_response_attachments` | 10 | Qiyas -- Qiyas Response: File/blob attachments | P |  |
| 61 | `qiyas_response_history` | 10 | Qiyas -- Qiyas Response: Historical change records | P |  |
| 62 | `qiyas_responses` | 12 | Qiyas -- Qiyas: Response records (questionnaire/survey/assessment) | P |  |
| 63 | `qiyas_score_explanations` | 10 | Qiyas -- Qiyas Score Explanations | N |  |
| 64 | `qiyas_score_snapshots` | 11 | Qiyas -- Qiyas Score: Point-in-time snapshots | P |  |
| 65 | `qiyas_scores` | 12 | Qiyas -- Qiyas Scores | N |  |
| 66 | `qiyas_sections` | 12 | Qiyas -- Qiyas Sections | N |  |
| 67 | `qiyas_template_versions` | 9 | Qiyas -- Qiyas Template: Versioned record history | P |  |
| 68 | `qiyas_templates` | 13 | Qiyas -- Qiyas: Template catalog | P |  |
| 69 | `risk_appetite_statements` | 16 | Qiyas -- Risk record (Risk Appetite Statements) | T |  |
| 70 | `roadmap_items` | 24 | Qiyas -- Roadmap Items | N |  |
| 71 | `strategic_objectives` | 20 | Qiyas -- Strategic Objectives | N |  |
| 72 | `strategic_themes` | 12 | Qiyas -- Strategic Themes | N |  |
