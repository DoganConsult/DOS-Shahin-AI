-- dos:draft
-- =====================================================================
-- UI-OS — shared ENUM types (foundation for DKNF compliance)  (20260502_0099)
--
-- Promotes every fixed-domain TEXT column across drafts 0100-0130 from
-- "CHECK (col IN (...))" to a proper Postgres ENUM type. Per the
-- normalization framework (platform/config-center/ops/normalization/
-- normalization-framework.md §DKNF):
--   ✗ "CHECK (col IN ('A','B','C')) on a TEXT column — the constraint
--      is expressible only in DDL, not as a domain. Promote to a
--      Postgres ENUM type or a lookup table with FK."
--
-- ENUM is preferred over lookup table for these because the values are
-- platform-DNA (not tenant-extensible). Adding a new value later is one
-- migration: ALTER TYPE <type> ADD VALUE 'new_value';
--
-- Naming convention: dos.ui_<purpose>_t  ("_t" suffix = type)
-- Plan: docs/migration/ui-os-tables-0100-0130-plan.md
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ---------------------------------------------------------------------
-- Permission/visibility primitives
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_perm_effect_t AS ENUM ('allow', 'deny');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_visibility_effect_t AS ENUM ('show', 'hide');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_visibility_rule_kind_t AS ENUM (
    'permission','role','feature_flag','expression','module_status',
    'time_window','tenant_attribute'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Widget data binding / lifecycle
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_widget_binding_kind_t AS ENUM (
    'rest','graphql','static','temporal_workflow','ai_query','sql_view'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_http_method_t AS ENUM ('GET','POST','PUT','DELETE','PATCH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_retry_strategy_t AS ENUM ('manual','linear','exponential','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Data grid primitives
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_grid_column_data_type_t AS ENUM (
    'text','number','integer','boolean','date','datetime','json','uuid',
    'enum','badge','link','currency','percent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_grid_column_capability_t AS ENUM (
    'view','edit','export','filter','sort'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_grid_export_format_t AS ENUM ('csv','xlsx','pdf','json');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Generic async job status (reused: exports, bulk jobs, imports, manager runs)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_job_status_t AS ENUM (
    'queued','running','succeeded','failed','expired','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Form runtime
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_form_field_kind_t AS ENUM (
    'text','textarea','number','integer','boolean','date','datetime',
    'select','multiselect','radio','checkbox','file','user_picker',
    'entity_picker','rich_text','signature','json','rating'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_form_rule_kind_t AS ENUM (
    'visible_when','required_when','enabled_when','value_when'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_form_validator_kind_t AS ENUM (
    'required','pattern','range','min_length','max_length','min','max',
    'email','url','phone','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_form_default_kind_t AS ENUM (
    'static','expression','from_user','from_tenant','from_workflow'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_form_submission_status_t AS ENUM (
    'draft','submitted','approved','rejected','withdrawn','superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_form_decision_t AS ENUM (
    'pending','approved','rejected','delegated','escalated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Notifications / inbox
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_notification_severity_t AS ENUM (
    'info','success','warning','error','critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_notification_channel_t AS ENUM (
    'in_app','email','sms','push','webhook'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_notification_digest_window_t AS ENUM (
    'instant','hourly','daily','weekly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Help / contextual help
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_contextual_help_display_t AS ENUM (
    'tooltip','popover','panel','inline','modal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_checklist_step_status_t AS ENUM (
    'not_started','in_progress','completed','skipped','blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Theme / branding
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_theme_token_kind_t AS ENUM (
    'color','radius','shadow','spacing','typography','motion','z_index','breakpoint'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_theme_target_kind_t AS ENUM ('tenant','role','user','product','module');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_brand_asset_kind_t AS ENUM (
    'logo','favicon','hero','watermark','social_card','letterhead','email_header'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_print_engine_t AS ENUM ('html','latex','docx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- i18n
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_locale_direction_t AS ENUM ('ltr','rtl');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Accessibility
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_contrast_mode_t AS ENUM ('default','high','inverted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_device_kind_t AS ENUM ('desktop','tablet','mobile','tv','watch');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_viewport_breakpoint_t AS ENUM ('xs','sm','md','lg','xl','xxl');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- WebOS / session
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_split_orientation_t AS ENUM ('horizontal','vertical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_command_surface_t AS ENUM (
    'palette','shortcut','menu','toolbar','context_menu','programmatic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Security / governance
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_target_kind_t AS ENUM (
    'route','page_layout','dashboard','widget_instance','action','form',
    'navigation_node','menu_item','tour','field','grid_column'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_change_kind_t AS ENUM (
    'create','update','delete','publish','rollback','approve','reject'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_publish_status_t AS ENUM (
    'pending','approved','rejected','cancelled','superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Feature flags / experiments
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_flag_target_kind_t AS ENUM ('tenant','role','user','product','module');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Telemetry — error class
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_error_kind_t AS ENUM (
    'render','api','permission','validation','timeout','network','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- AI workspace
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_ai_panel_position_t AS ENUM ('left','right','bottom','floating');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dos.ui_ai_action_draft_state_t AS ENUM (
    'pending','confirmed','executed','rejected','expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Manager Studio
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE dos.ui_manager_draft_state_t AS ENUM (
    'draft','validating','submitted','rejected','published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
