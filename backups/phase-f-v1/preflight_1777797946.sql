--
-- PostgreSQL database dump
--

\restrict g0f9nInZpXTC0iHyY7ogoJH7FnT5s5GhIs5JBmswAcew9I7F8cyzGJGZLdRKr7V

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
-- Data for Name: ui_route_calendar_event; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_calendar_event (id, route, sort_order, event_id, title_en, title_ar, category, starts_at, ends_at, status, severity, link) FROM stdin;
\.


--
-- Data for Name: ui_route_org_chart_node; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_org_chart_node (id, route, node_id, parent_id, sort_order, title_en, title_ar, role, owner, badge) FROM stdin;
\.


--
-- Data for Name: ui_route_ownership_edge; Type: TABLE DATA; Schema: dos; Owner: dos_auth
--

COPY dos.ui_route_ownership_edge (id, route, sort_order, edge_id, entity_id, entity_label, owner, ownership_role, effective_from, effective_to) FROM stdin;
\.


--
-- Name: ui_route_calendar_event_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_calendar_event_id_seq', 1, false);


--
-- Name: ui_route_org_chart_node_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_org_chart_node_id_seq', 1, false);


--
-- Name: ui_route_ownership_edge_id_seq; Type: SEQUENCE SET; Schema: dos; Owner: dos_auth
--

SELECT pg_catalog.setval('dos.ui_route_ownership_edge_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict g0f9nInZpXTC0iHyY7ogoJH7FnT5s5GhIs5JBmswAcew9I7F8cyzGJGZLdRKr7V

