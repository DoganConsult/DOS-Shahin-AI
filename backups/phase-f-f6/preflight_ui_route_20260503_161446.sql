--
-- PostgreSQL database dump
--

\restrict uCQJ54SDUnFR4s4Khb8nricmnwLtl2EmUAyQsqvkLspGbwbEUyhsPVbaJOx9jl5

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
-- Data for Name: ui_route_column; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_heatmap_axis; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_kpi; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_nba; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_report_card; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_setting_section; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_tab; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Data for Name: ui_route_template_binding; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/access', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/access/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/access/permissions', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/access/sessions', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/access/settings', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ai', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ai/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ai/engine', 'trend-intelligence', 'TrendIntelligenceTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ai/gateway', 'trend-intelligence', 'TrendIntelligenceTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ai/governance', 'module-settings', 'ModuleSettingsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/config-center', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/config-center/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/config-center/flags', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/config-center/settings', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/config-center/tokens', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dauth', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dauth/audit', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dauth/permissions', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dauth/roles', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dauth/users', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dnoc', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dnoc/alerts', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dnoc/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dnoc/metrics', 'trend-intelligence', 'TrendIntelligenceTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dnoc/services', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dos', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dos/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dos/events', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dos/registries', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dos/schemas', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dsoc', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dsoc/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dsoc/detections', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dsoc/incidents', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/dsoc/policies', 'module-settings', 'ModuleSettingsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/foundation', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/foundation/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/foundation/lifecycle', 'module-settings', 'ModuleSettingsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/foundation/organizations', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/foundation/persons', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/multi-tenant', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/multi-tenant/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/multi-tenant/provisioning', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/multi-tenant/quotas', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/multi-tenant/tenants', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/runtime', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/runtime/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/runtime/health', 'risk-landscape', 'ModuleHeatmapTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/runtime/services', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/runtime/settings', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/tenants', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/tenants/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/tenants/directory', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/tenants/members', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/tenants/profile', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ui-system', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ui-system/audit', 'evidence-reports', 'ModuleReportsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ui-system/components', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ui-system/settings', 'command-home', 'ModuleOverviewTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/admin/ui-system/themes', 'intelligent-register', 'ModuleRecordsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/settings', 'module-settings', 'ModuleSettingsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version, updated_at) VALUES ('/tenant-settings', 'module-settings', 'ModuleSettingsTemplateComponent', '{}', 1, '2026-05-03 06:07:52.838474+00');


--
-- Data for Name: ui_route_workqueue_group; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--



--
-- Name: ui_route_column_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_column_id_seq', 1, false);


--
-- Name: ui_route_heatmap_axis_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_heatmap_axis_id_seq', 1, false);


--
-- Name: ui_route_kpi_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_kpi_id_seq', 1, false);


--
-- Name: ui_route_nba_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_nba_id_seq', 1, false);


--
-- Name: ui_route_report_card_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_report_card_id_seq', 1, false);


--
-- Name: ui_route_setting_section_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_setting_section_id_seq', 1, false);


--
-- Name: ui_route_tab_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_tab_id_seq', 1, false);


--
-- Name: ui_route_workqueue_group_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_workqueue_group_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict uCQJ54SDUnFR4s4Khb8nricmnwLtl2EmUAyQsqvkLspGbwbEUyhsPVbaJOx9jl5

