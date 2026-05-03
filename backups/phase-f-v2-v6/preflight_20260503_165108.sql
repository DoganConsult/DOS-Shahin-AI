--
-- PostgreSQL database dump
--

\restrict 6O1zhn4FtuAHzFnfvX1ZoQs1dadIjMnTBgcsVuudPZzAKnB3VFBVQJ5PdlEAXIl

-- Dumped from database version 18.3 (Ubuntu 18.3-1.pgdg22.04+1)
-- Dumped by pg_dump version 18.3 (Ubuntu 18.3-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ui_route_agent_flow_step; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_agent_flow_step (id, route, sort_order, step_id, label_en, label_ar, step_type, agent_id, status, evidence_uri) FROM stdin;
\.


--
-- Data for Name: ui_route_agent_registry; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_agent_registry (id, route, sort_order, agent_id, name_en, name_ar, agent_type, capability, status, owner, ai_model) FROM stdin;
\.


--
-- Data for Name: ui_route_audit_evidence_artifact; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_audit_evidence_artifact (id, route, sort_order, artifact_id, title_en, title_ar, artifact_type, hash, collected_at, collected_by, download_url) FROM stdin;
\.


--
-- Data for Name: ui_route_audit_ledger_row; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_audit_ledger_row (id, route, sort_order, ledger_id, occurred_at, actor, action, entity_type, entity_id, prev_hash, hash, decision_ref) FROM stdin;
\.


--
-- Data for Name: ui_route_calendar_event; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_calendar_event (id, route, sort_order, event_id, title_en, title_ar, category, starts_at, ends_at, status, severity, link) FROM stdin;
1	/admin/foundation/lifecycle	0	fl-q1-org-review	Q1 Organization Lifecycle Review	مراجعة دورة حياة المؤسسة للربع الأول	internal	2026-05-15 09:00:00+00	2026-05-15 12:00:00+00	scheduled	info	/admin/foundation/organizations
2	/admin/foundation/lifecycle	1	fl-tenant-quarterly-attestation	Tenant Quarterly Attestation Window Opens	فتح نافذة الإقرارات الفصلية للمستأجرين	regulatory	2026-06-01 00:00:00+00	2026-06-30 23:59:59+00	scheduled	warning	\N
3	/admin/foundation/lifecycle	2	fl-person-recert-h1	H1 Person Re-certification Cycle	دورة إعادة اعتماد الأشخاص للنصف الأول	audit	2026-05-20 08:00:00+00	2026-06-20 17:00:00+00	in-progress	info	\N
4	/admin/foundation/lifecycle	3	fl-policy-refresh-board	Foundation Policy Refresh — Board Sign-off	تجديد سياسة الأساس - موافقة مجلس الإدارة	review	2026-07-10 14:00:00+00	\N	scheduled	info	\N
\.


--
-- Data for Name: ui_route_column; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_column (id, route, sort_order, field_key, label_en, label_ar, type, sortable) FROM stdin;
\.


--
-- Data for Name: ui_route_delegation_rule; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_delegation_rule (id, route, sort_order, rule_id, delegator, delegate, scope, permission, starts_at, ends_at, status) FROM stdin;
\.


--
-- Data for Name: ui_route_export_artifact; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_export_artifact (id, route, sort_order, artifact_id, title_en, title_ar, format, status, size_kb, download_url, generated_at) FROM stdin;
\.


--
-- Data for Name: ui_route_follow_up_item; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_follow_up_item (id, route, sort_order, item_id, title_en, title_ar, origin_ref, owner, due_at, status, severity, ai_score) FROM stdin;
\.


--
-- Data for Name: ui_route_heatmap_axis; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_heatmap_axis (id, route, axis, sort_order, label_en, label_ar, bucket_key) FROM stdin;
\.


--
-- Data for Name: ui_route_incident_communication; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_incident_communication (id, route, sort_order, comm_id, channel, audience, sent_at, message_en, message_ar) FROM stdin;
\.


--
-- Data for Name: ui_route_incident_runbook_step; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_incident_runbook_step (id, route, sort_order, step_id, label_en, label_ar, phase, owner, due_at, status, evidence_uri) FROM stdin;
\.


--
-- Data for Name: ui_route_kpi; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_kpi (id, route, sort_order, label_en, label_ar, source_path, format, ai_insight, status, link) FROM stdin;
\.


--
-- Data for Name: ui_route_nba; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_nba (id, route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity) FROM stdin;
\.


--
-- Data for Name: ui_route_org_chart_node; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_org_chart_node (id, route, node_id, parent_id, sort_order, title_en, title_ar, role, owner, badge) FROM stdin;
1	/admin/foundation/organizations	root	\N	0	Shahin AI Platform	منصة شاهين الذكية	platform	platform-admin	GLOBAL
2	/admin/foundation/organizations	tenant-grc	root	1	GRC Tenant	مستأجر الحوكمة	tenant	tenant-admin@grc	ACTIVE
3	/admin/foundation/organizations	ou-risk	tenant-grc	2	Risk Operations	عمليات المخاطر	org-unit	risk-lead@grc	\N
4	/admin/foundation/organizations	ou-audit	tenant-grc	3	Internal Audit	التدقيق الداخلي	org-unit	audit-lead@grc	\N
5	/admin/foundation/organizations	ou-compliance	tenant-grc	4	Compliance	الالتزام	org-unit	compliance-lead@grc	\N
6	/admin/foundation/organizations	team-cyber	ou-risk	5	Cybersecurity Risk	مخاطر الأمن السيبراني	team	ciso@grc	\N
7	/admin/foundation/organizations	team-third	ou-risk	6	Third-Party Risk	مخاطر الأطراف الثالثة	team	tprm-lead@grc	\N
8	/admin/foundation/organizations	tenant-fin	root	7	Financial Services Tenant	مستأجر الخدمات المالية	tenant	tenant-admin@fin	ACTIVE
9	/admin/foundation/organizations	ou-fin-risk	tenant-fin	8	Risk & Capital	المخاطر ورأس المال	org-unit	cro@fin	\N
\.


--
-- Data for Name: ui_route_ownership_edge; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_ownership_edge (id, route, sort_order, edge_id, entity_id, entity_label, owner, ownership_role, effective_from, effective_to) FROM stdin;
1	/admin/foundation/persons	0	p-1	person-001	Sara AlOtaibi	ciso@grc	accountable	2025-01-01	\N
2	/admin/foundation/persons	1	p-2	person-002	Mohammed Saif	risk-lead@grc	responsible	2025-03-15	\N
3	/admin/foundation/persons	2	p-3	person-003	Aisha Khaled	audit-lead@grc	consulted	2025-04-01	\N
4	/admin/foundation/persons	3	p-4	person-004	Yousef Hassan	compliance-lead@grc	informed	2025-02-10	\N
5	/admin/foundation/persons	4	p-5	person-005	Layla Al-Sayed	tenant-admin@grc	approver	2024-12-01	\N
6	/admin/foundation/persons	5	p-6	person-006	Khalid Al-Rashid	tprm-lead@grc	custodian	2025-05-01	\N
7	/admin/foundation/persons	6	p-7	person-007	Noura AlSubaie	cro@fin	reviewer	2025-01-15	\N
\.


--
-- Data for Name: ui_route_report_card; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_report_card (id, route, sort_order, report_id, title_en, title_ar, description, status, tag, ai_generated, download_url) FROM stdin;
\.


--
-- Data for Name: ui_route_roadmap_milestone; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_roadmap_milestone (id, route, sort_order, milestone_id, title_en, title_ar, description, target_date, progress, status, owner) FROM stdin;
\.


--
-- Data for Name: ui_route_setting_section; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_setting_section (id, route, section_id, sort_order, label_en, label_ar, icon) FROM stdin;
\.


--
-- Data for Name: ui_route_tab; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_tab (id, route, tab_id, sort_order, label_en, label_ar, permission) FROM stdin;
\.


--
-- Data for Name: ui_route_template_binding; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) FROM stdin;
/admin/access/permissions	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/access/sessions	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/access/settings	command-home	ModuleOverviewTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/config-center/flags	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/config-center/settings	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/config-center/tokens	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/dauth/users	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/dnoc/metrics	trend-intelligence	TrendIntelligenceTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/dos/events	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/dos/schemas	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/dsoc/detections	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/runtime/health	risk-landscape	ModuleHeatmapTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/runtime/services	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/runtime/settings	command-home	ModuleOverviewTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/tenants/directory	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/tenants/members	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/tenants/profile	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/ui-system/components	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/ui-system/settings	command-home	ModuleOverviewTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/ui-system/themes	intelligent-register	ModuleRecordsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/settings	module-settings	ModuleSettingsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/tenant-settings	module-settings	ModuleSettingsTemplateComponent	{}	1	2026-05-03 06:07:52.838474+00
/admin/access/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ai/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/config-center/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dnoc/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dos/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dsoc/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/foundation/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/multi-tenant/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/runtime/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/tenants/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ui-system/audit	audit-trail-ledger	AuditTrailLedgerTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dauth/audit	audit-trail-evidence	AuditTrailEvidenceTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/access	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/config-center	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dauth	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dos	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/foundation	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/multi-tenant	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/tenants	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ui-system	decision-dashboard	DecisionDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dnoc	command-dashboard	CommandDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dsoc	command-dashboard	CommandDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/runtime	command-dashboard	CommandDashboardTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/foundation/organizations	org-chart	OrgChartTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dauth/permissions	ownership-map	OwnershipMapTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/foundation/persons	ownership-map	OwnershipMapTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/multi-tenant/tenants	ownership-map	OwnershipMapTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dauth/roles	delegation-center	DelegationCenterTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ai/engine	agent-registry	AgentRegistryTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ai/gateway	agent-registry	AgentRegistryTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ai/governance	user-agent-workbench	UserAgentWorkbenchTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/ai	agent-flow	AgentFlowTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/foundation/lifecycle	calendar-timeline	CalendarTimelineTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dnoc/alerts	incident-response	IncidentResponseTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dsoc/incidents	incident-response	IncidentResponseTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dos/registries	export-center	ExportCenterTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/multi-tenant/provisioning	workflow-timeline	WorkflowTimelineTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dnoc/services	follow-up-center	FollowUpCenterTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/multi-tenant/quotas	remediation-roadmap	RemediationRoadmapTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
/admin/dsoc/policies	compliance-calendar	ComplianceCalendarTemplateComponent	{}	2	2026-05-03 08:18:39.790193+00
\.


--
-- Data for Name: ui_route_workflow_timeline_step; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_workflow_timeline_step (id, route, sort_order, step_id, label_en, label_ar, state, description, occurred_at, actor) FROM stdin;
\.


--
-- Data for Name: ui_route_workqueue_group; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_workqueue_group (id, route, group_id, sort_order, label_en, label_ar, urgency, filter_expr) FROM stdin;
\.


--
-- Name: ui_route_agent_flow_step_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_agent_flow_step_id_seq', 1, false);


--
-- Name: ui_route_agent_registry_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_agent_registry_id_seq', 1, false);


--
-- Name: ui_route_audit_evidence_artifact_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_audit_evidence_artifact_id_seq', 1, false);


--
-- Name: ui_route_audit_ledger_row_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_audit_ledger_row_id_seq', 1, false);


--
-- Name: ui_route_calendar_event_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_calendar_event_id_seq', 4, true);


--
-- Name: ui_route_column_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_column_id_seq', 1, false);


--
-- Name: ui_route_delegation_rule_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_delegation_rule_id_seq', 1, false);


--
-- Name: ui_route_export_artifact_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_export_artifact_id_seq', 1, false);


--
-- Name: ui_route_follow_up_item_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_follow_up_item_id_seq', 1, false);


--
-- Name: ui_route_heatmap_axis_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_heatmap_axis_id_seq', 1, false);


--
-- Name: ui_route_incident_communication_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_incident_communication_id_seq', 1, false);


--
-- Name: ui_route_incident_runbook_step_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_incident_runbook_step_id_seq', 1, false);


--
-- Name: ui_route_kpi_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_kpi_id_seq', 1, false);


--
-- Name: ui_route_nba_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_nba_id_seq', 1, false);


--
-- Name: ui_route_org_chart_node_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_org_chart_node_id_seq', 9, true);


--
-- Name: ui_route_ownership_edge_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_ownership_edge_id_seq', 7, true);


--
-- Name: ui_route_report_card_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_report_card_id_seq', 1, false);


--
-- Name: ui_route_roadmap_milestone_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_roadmap_milestone_id_seq', 1, false);


--
-- Name: ui_route_setting_section_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_setting_section_id_seq', 1, false);


--
-- Name: ui_route_tab_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_tab_id_seq', 1, false);


--
-- Name: ui_route_workflow_timeline_step_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_workflow_timeline_step_id_seq', 1, false);


--
-- Name: ui_route_workqueue_group_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_workqueue_group_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict 6O1zhn4FtuAHzFnfvX1ZoQs1dadIjMnTBgcsVuudPZzAKnB3VFBVQJ5PdlEAXIl

