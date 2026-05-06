--
-- PostgreSQL database dump
--

\restrict yeVyX15Scu7eyCVVItTRdKFQ1ry7G2BA5lLdeRZHy7312gGzXtaa3XsqMj8xYzB

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dynamic_ui_route_metadata; Type: TABLE; Schema: dos; Owner: dos_migrator
--

CREATE TABLE dos.dynamic_ui_route_metadata (
    route text NOT NULL,
    render_mode text DEFAULT 'template'::text NOT NULL,
    template_binding_required boolean DEFAULT true NOT NULL,
    notes text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata_public boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_dynamic_ui_route_metadata_render_mode CHECK ((render_mode = ANY (ARRAY['template'::text, 'shell-only'::text, 'redirect'::text])))
);


ALTER TABLE dos.dynamic_ui_route_metadata OWNER TO dos_migrator;

--
-- Name: functional_roles; Type: TABLE; Schema: platform_dauth; Owner: dos_migrator
--

CREATE TABLE platform_dauth.functional_roles (
    role_id character varying(64) NOT NULL,
    role_code character varying(100) NOT NULL,
    display_name character varying(255),
    description text,
    permissions text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    display_name_en text,
    display_name_ar text,
    description_en text,
    description_ar text
);


ALTER TABLE platform_dauth.functional_roles OWNER TO dos_migrator;

--
-- Name: COLUMN functional_roles.permissions; Type: COMMENT; Schema: platform_dauth; Owner: dos_migrator
--

COMMENT ON COLUMN platform_dauth.functional_roles.permissions IS 'DEPRECATED: This array column is deprecated in favor of the role_permissions table.
Phase 1B reconciliation (20260505_2100) made role_permissions the single source of truth.
This column is kept for read-only compatibility during transition period.
Do NOT write to this column directly. Use role_permissions table instead.
Future migration will drop this column after all code paths are migrated.';


--
-- Name: ui_route_template_binding; Type: TABLE; Schema: dos; Owner: dos_migrator
--

CREATE TABLE dos.ui_route_template_binding (
    route text NOT NULL,
    archetype text NOT NULL,
    template_export text NOT NULL,
    props jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title_en text,
    title_ar text,
    subtitle_en text,
    subtitle_ar text,
    eyebrow_en text,
    eyebrow_ar text,
    ai_headline_en text,
    ai_headline_ar text,
    status_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    primary_action jsonb,
    CONSTRAINT chk_archetype CHECK ((archetype = ANY (ARRAY['command-home'::text, 'decision-dashboard'::text, 'command-dashboard'::text, 'posture-overview'::text, 'trend-intelligence'::text, 'intelligent-register'::text, 'risk-landscape'::text, 'record-story'::text, 'guided-create'::text, 'action-queue'::text, 'workflow-control'::text, 'workflow-timeline'::text, 'follow-up-center'::text, 'evidence-reports'::text, 'export-center'::text, 'audit-trail'::text, 'audit-trail-ledger'::text, 'audit-trail-evidence'::text, 'calendar-timeline'::text, 'compliance-calendar'::text, 'remediation-roadmap'::text, 'org-chart'::text, 'ownership-map'::text, 'delegation-center'::text, 'ai-advisor'::text, 'agent-flow'::text, 'agent-registry'::text, 'user-agent-workbench'::text, 'module-settings'::text, 'activation-journey'::text, 'incident-response'::text, 'case-finalization'::text, 'marketing-landing'::text, 'auth-page'::text])))
);


ALTER TABLE dos.ui_route_template_binding OWNER TO dos_migrator;

--
-- Name: COLUMN ui_route_template_binding.props; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For platform: {brandCode, eyebrow, title, sub, overview, architecture, features, integrations, ctaLabel, ctaHref}';


--
-- Name: COLUMN ui_route_template_binding.title_en; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.title_en IS 'Masthead H1 (en) — projected to props.masthead.title';


--
-- Name: COLUMN ui_route_template_binding.title_ar; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.title_ar IS 'Masthead H1 (ar) — projected to props.masthead.title';


--
-- Name: COLUMN ui_route_template_binding.subtitle_en; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.subtitle_en IS 'Masthead subtitle (en)';


--
-- Name: COLUMN ui_route_template_binding.subtitle_ar; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.subtitle_ar IS 'Masthead subtitle (ar)';


--
-- Name: COLUMN ui_route_template_binding.eyebrow_en; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.eyebrow_en IS 'Masthead breadcrumb eyebrow (en)';


--
-- Name: COLUMN ui_route_template_binding.eyebrow_ar; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.eyebrow_ar IS 'Masthead breadcrumb eyebrow (ar)';


--
-- Name: COLUMN ui_route_template_binding.ai_headline_en; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.ai_headline_en IS 'Inline cds-ai-label headline (en)';


--
-- Name: COLUMN ui_route_template_binding.ai_headline_ar; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.ai_headline_ar IS 'Inline cds-ai-label headline (ar)';


--
-- Name: COLUMN ui_route_template_binding.status_tags; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.status_tags IS 'Array of {label,severity} surfacing as cds-tag chips.';


--
-- Name: COLUMN ui_route_template_binding.primary_action; Type: COMMENT; Schema: dos; Owner: dos_migrator
--

COMMENT ON COLUMN dos.ui_route_template_binding.primary_action IS '{label, route, permission?} object surfacing as cdsButton.';


--
-- Name: permissions; Type: TABLE; Schema: platform_dauth; Owner: dos_migrator
--

CREATE TABLE platform_dauth.permissions (
    permission_id character varying(64) NOT NULL,
    permission_code character varying(200) NOT NULL,
    module_code character varying(50),
    resource_type character varying(50),
    action_type character varying(50),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    label_en text,
    label_ar text,
    description_en text,
    description_ar text
);


ALTER TABLE platform_dauth.permissions OWNER TO dos_migrator;

--
-- Name: ui_module_nav_item; Type: TABLE; Schema: dos; Owner: dos_auth
--

CREATE TABLE dos.ui_module_nav_item (
    module_code text NOT NULL,
    item_id text NOT NULL,
    group_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    route text NOT NULL,
    icon text,
    permission text,
    label_key text,
    label_en text,
    label_ar text,
    badge text,
    enabled boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE dos.ui_module_nav_item OWNER TO dos_auth;

--
-- Name: TABLE ui_module_nav_item; Type: COMMENT; Schema: dos; Owner: dos_auth
--

COMMENT ON TABLE dos.ui_module_nav_item IS 'Phase F-F10 layer 3.b: ordered items per module. Items optionally belong to a group; both groups and items have explicit sort_order.';


--
-- Name: dynamic_ui_route_metadata dynamic_ui_route_metadata_pkey; Type: CONSTRAINT; Schema: dos; Owner: dos_migrator
--

ALTER TABLE ONLY dos.dynamic_ui_route_metadata
    ADD CONSTRAINT dynamic_ui_route_metadata_pkey PRIMARY KEY (route);


--
-- Name: ui_module_nav_item ui_module_nav_item_pkey; Type: CONSTRAINT; Schema: dos; Owner: dos_auth
--

ALTER TABLE ONLY dos.ui_module_nav_item
    ADD CONSTRAINT ui_module_nav_item_pkey PRIMARY KEY (module_code, item_id);


--
-- Name: ui_route_template_binding ui_route_template_binding_pkey; Type: CONSTRAINT; Schema: dos; Owner: dos_migrator
--

ALTER TABLE ONLY dos.ui_route_template_binding
    ADD CONSTRAINT ui_route_template_binding_pkey PRIMARY KEY (route);


--
-- Name: functional_roles functional_roles_pkey; Type: CONSTRAINT; Schema: platform_dauth; Owner: dos_migrator
--

ALTER TABLE ONLY platform_dauth.functional_roles
    ADD CONSTRAINT functional_roles_pkey PRIMARY KEY (role_id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: platform_dauth; Owner: dos_migrator
--

ALTER TABLE ONLY platform_dauth.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: ix_dynamic_ui_route_metadata_is_public; Type: INDEX; Schema: dos; Owner: dos_migrator
--

CREATE INDEX ix_dynamic_ui_route_metadata_is_public ON dos.dynamic_ui_route_metadata USING btree (is_public) WHERE (is_public = true);


--
-- Name: ix_dynamic_ui_route_metadata_metadata_public; Type: INDEX; Schema: dos; Owner: dos_migrator
--

CREATE INDEX ix_dynamic_ui_route_metadata_metadata_public ON dos.dynamic_ui_route_metadata USING btree (metadata_public) WHERE (metadata_public = true);


--
-- Name: ix_dynamic_ui_route_metadata_render_mode; Type: INDEX; Schema: dos; Owner: dos_migrator
--

CREATE INDEX ix_dynamic_ui_route_metadata_render_mode ON dos.dynamic_ui_route_metadata USING btree (render_mode);


--
-- Name: ix_ui_module_nav_item_module_group; Type: INDEX; Schema: dos; Owner: dos_auth
--

CREATE INDEX ix_ui_module_nav_item_module_group ON dos.ui_module_nav_item USING btree (module_code, group_id, sort_order);


--
-- Name: uq_platform_dauth_permissions_code; Type: INDEX; Schema: platform_dauth; Owner: dos_migrator
--

CREATE UNIQUE INDEX uq_platform_dauth_permissions_code ON platform_dauth.permissions USING btree (permission_code);


--
-- Name: ui_module_nav_item trg_bump_ui_module_nav_item_version; Type: TRIGGER; Schema: dos; Owner: dos_auth
--

CREATE TRIGGER trg_bump_ui_module_nav_item_version BEFORE UPDATE ON dos.ui_module_nav_item FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();


--
-- Name: ui_route_template_binding trg_bump_ui_route_template_version; Type: TRIGGER; Schema: dos; Owner: dos_migrator
--

CREATE TRIGGER trg_bump_ui_route_template_version BEFORE UPDATE ON dos.ui_route_template_binding FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_route_template_version();


--
-- Name: ui_route_template_binding trg_validate_template_export; Type: TRIGGER; Schema: dos; Owner: dos_migrator
--

CREATE TRIGGER trg_validate_template_export BEFORE INSERT OR UPDATE OF template_export ON dos.ui_route_template_binding FOR EACH ROW EXECUTE FUNCTION dos.validate_template_export_registry();


--
-- Name: functional_roles trg_sync_role_permissions; Type: TRIGGER; Schema: platform_dauth; Owner: dos_migrator
--

CREATE TRIGGER trg_sync_role_permissions AFTER UPDATE OF permissions ON platform_dauth.functional_roles FOR EACH ROW EXECUTE FUNCTION platform_dauth.sync_role_permissions_on_functional_roles_update();


--
-- Name: functional_roles trg_sync_role_permissions_insert; Type: TRIGGER; Schema: platform_dauth; Owner: dos_migrator
--

CREATE TRIGGER trg_sync_role_permissions_insert AFTER INSERT ON platform_dauth.functional_roles FOR EACH ROW EXECUTE FUNCTION platform_dauth.sync_role_permissions_on_functional_roles_update();


--
-- Name: ui_route_template_binding fk_template_export_registry; Type: FK CONSTRAINT; Schema: dos; Owner: dos_migrator
--

ALTER TABLE ONLY dos.ui_route_template_binding
    ADD CONSTRAINT fk_template_export_registry FOREIGN KEY (template_export) REFERENCES dos.dynamic_ui_component_registry(component_key) ON DELETE RESTRICT;


--
-- Name: ui_module_nav_item ui_module_nav_item_module_code_group_id_fkey; Type: FK CONSTRAINT; Schema: dos; Owner: dos_auth
--

ALTER TABLE ONLY dos.ui_module_nav_item
    ADD CONSTRAINT ui_module_nav_item_module_code_group_id_fkey FOREIGN KEY (module_code, group_id) REFERENCES dos.ui_module_nav_group(module_code, group_id) ON DELETE SET NULL;


--
-- Name: TABLE dynamic_ui_route_metadata; Type: ACL; Schema: dos; Owner: dos_migrator
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE dos.dynamic_ui_route_metadata TO dos_app;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE dos.dynamic_ui_route_metadata TO dos_auth;


--
-- Name: TABLE functional_roles; Type: ACL; Schema: platform_dauth; Owner: dos_migrator
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_auth;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_gateway;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_tenant;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_workflow;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_audit;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_notification;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_ai;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.functional_roles TO dos_app;


--
-- Name: TABLE ui_route_template_binding; Type: ACL; Schema: dos; Owner: dos_migrator
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE dos.ui_route_template_binding TO dos_auth;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE dos.ui_route_template_binding TO dos_app;


--
-- Name: TABLE permissions; Type: ACL; Schema: platform_dauth; Owner: dos_migrator
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_auth;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_gateway;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_tenant;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_workflow;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_audit;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_notification;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_ai;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE platform_dauth.permissions TO dos_app;


--
-- PostgreSQL database dump complete
--

\unrestrict yeVyX15Scu7eyCVVItTRdKFQ1ry7G2BA5lLdeRZHy7312gGzXtaa3XsqMj8xYzB

