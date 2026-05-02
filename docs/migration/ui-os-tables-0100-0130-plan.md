# UI-OS Tables 0100–0130 — Migration Plan

**Status:** DRAFT — 2026-05-01
**Owner:** platform team
**Scope:** design and reserve filenames for the 121 remaining `dos.ui_*` tables from §5–§20 of [the master checklist](../Use%20it%20as%20the%20master%20checklist,%20but%20impl), as **31 atomic migrations numbered 0100–0130** with consistent UUID PKs and tenant-isolation columns.
**Filename prefix:** `20260502_<NNNN>_<slug>.sql`

> **Safety lock:** every file in this plan ships with the `-- dos:draft` header so [migration-runner.ts](../../platform/config-center/migration/migration-runner.ts) refuses to apply it. Promotion to apply happens **only** after the matching wave's chassis (manager + API + RBAC + audit) is green per [ui-os-gap-closure-plan.md](./ui-os-gap-closure-plan.md). This file is a **filename + schema reservation**, not an apply order.

---

## Canonical column convention

Every UI-OS table created by this plan uses these columns unless explicitly marked platform-global. Locked from existing 0302–0306 conventions to avoid drift.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | PK |
| `tenant_id` | `VARCHAR(64)` | — | NOT NULL except platform-global tables (locales, theme tokens catalog, feature flag definitions). Indexed. |
| `user_id` | `VARCHAR(64)` | — | NOT NULL on per-user tables. |
| `product_code` | `VARCHAR(100)` | NULL | Optional scoping to product (Shahin, Dogan, …). |
| `module_code` | `VARCHAR(100)` | NULL | Optional scoping to module (Foundation, AI-OS, …). |
| `name_key` / `title_key` / `description_key` | `VARCHAR(150–200)` | NULL | i18n keys, never raw strings. |
| `required_permission` | `VARCHAR(150)` | NULL | Bound to canonical 544-perm catalogue. |
| `role_codes` | `TEXT[]` | `ARRAY[]::text[]` | Optional role gating. |
| `metadata` / `config` | `JSONB` | `'{}'::jsonb` | Free-form structured payload. |
| `is_active` | `BOOLEAN` | `true` | Soft-delete via `false`. |
| `created_by` / `updated_by` | `VARCHAR(64)` | NULL | Actor IDs (matches `dos.audit_trail.actor_id`). |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOW()` | Always present. |

**Indexes** (per table): `(tenant_id)` btree always; `(tenant_id, <natural_key>)` UNIQUE on every entity table; `(tenant_id, user_id)` on per-user; partial indexes on `is_active = true` for hot-path lookups.

**RLS hook** (added in chassis Phase 1.1, not in these migrations): `USING (tenant_id = current_setting('app.current_tenant_id', true))`.

**FKs:** `ON DELETE CASCADE` to parent entity (`ui_form_fields → ui_form_sections`, `ui_widget_data_bindings → ui_widget_instances`, etc.); `ON DELETE SET NULL` to soft-reference (`created_by`, `module_code`).

**File template** ([template](#file-template-shipped-as-_template-not-applied) at end of doc).

---

## Inventory: 121 tables → 31 migrations

| # | File | Section | Tables | Count |
|---|---|---|---|---:|
| 0100 | `widget_instances.sql` | §5 Widgets | `ui_widget_instances`, `ui_widget_instance_permissions` | 2 |
| 0101 | `widget_data_lifecycle.sql` | §5 Widgets | `ui_widget_data_bindings`, `ui_widget_refresh_policies`, `ui_widget_error_states` | 3 |
| 0102 | `widget_visibility_personalization.sql` | §5 Widgets | `ui_widget_visibility_rules`, `ui_widget_personalization`, `ui_widget_catalog_categories` | 3 |
| 0103 | `grid_columns.sql` | §6 Grids | `ui_data_grid_column_catalog`, `ui_data_grid_column_permissions` | 2 |
| 0104 | `grid_views_exports.sql` | §6 Grids | `ui_data_grid_saved_views`, `ui_data_grid_exports` | 2 |
| 0105 | `grid_jobs_edits.sql` | §6 Grids | `ui_data_grid_bulk_jobs`, `ui_data_grid_inline_edit_sessions`, `ui_data_grid_validation_errors` | 3 |
| 0106 | `form_definitions.sql` | §7 Forms | `ui_form_definitions`, `ui_form_sections`, `ui_form_fields` | 3 |
| 0107 | `form_rules.sql` | §7 Forms | `ui_form_field_rules`, `ui_form_validation_rules`, `ui_form_default_values` | 3 |
| 0108 | `form_runtime.sql` | §7 Forms | `ui_form_submissions`, `ui_form_drafts`, `ui_form_attachments`, `ui_form_approval_links` | 4 |
| 0109 | `search_topology.sql` | §8 Search | `ui_search_providers`, `ui_search_indexes`, `ui_search_scopes` | 3 |
| 0110 | `search_runtime.sql` | §8 Search | `ui_search_history`, `ui_search_saved_queries`, `ui_command_execution_log` | 3 |
| 0111 | `notification_center.sql` | §9 Notifications | `ui_notification_center_items`, `ui_notification_preferences`, `ui_notification_read_state` | 3 |
| 0112 | `inbox.sql` | §9 Notifications | `ui_inbox_views`, `ui_inbox_rules`, `ui_inbox_snoozes`, `ui_inbox_assignments` | 4 |
| 0113 | `help_articles.sql` | §10 Help | `ui_help_articles`, `ui_help_collections`, `ui_contextual_help_links` | 3 |
| 0114 | `onboarding_progress.sql` | §10 Help | `ui_empty_state_content`, `ui_checklists`, `ui_user_checklist_progress`, `ui_release_notes`, `ui_user_release_notes_read` | 5 |
| 0115 | `theme_runtime.sql` | §11 Branding | `ui_theme_profiles`, `ui_theme_tokens`, `ui_theme_assignments` | 3 |
| 0116 | `brand_assets.sql` | §11 Branding | `ui_brand_assets`, `ui_login_branding`, `ui_email_branding`, `ui_report_branding`, `ui_print_templates` | 5 |
| 0117 | `i18n_governance.sql` | §12 i18n | `ui_translation_namespaces`, `ui_translation_versions`, `ui_translation_overrides`, `ui_locale_user_preferences`, `ui_rtl_validation_results` | 5 |
| 0118 | `accessibility_device.sql` | §13 A11y | `ui_accessibility_preferences`, `ui_reduced_motion_preferences`, `ui_contrast_preferences`, `ui_font_scale_preferences`, `ui_device_preferences`, `ui_device_sessions`, `ui_viewport_profiles` | 7 |
| 0119 | `webos_window_panels.sql` | §14 WebOS | `ui_workspace_sessions`, `ui_window_states`, `ui_panel_states`, `ui_tab_states` | 4 |
| 0120 | `webos_drag_clipboard.sql` | §14 WebOS | `ui_split_view_states`, `ui_drag_drop_layout_events`, `ui_clipboard_items`, `ui_workspace_restore_points` | 4 |
| 0121 | `visibility_permission.sql` | §15 Security | `ui_visibility_rules`, `ui_permission_bindings`, `ui_policy_evaluation_log`, `ui_denied_render_log` | 4 |
| 0122 | `role_assignments.sql` | §15 Security | `ui_role_layout_assignments`, `ui_role_dashboard_assignments`, `ui_role_navigation_assignments` | 3 |
| 0123 | `governance_publish.sql` | §16 Governance | `ui_change_log`, `ui_publish_requests`, `ui_publish_approvals`, `ui_published_versions` | 4 |
| 0124 | `governance_drafts_audit.sql` | §16 Governance | `ui_draft_versions`, `ui_rollback_points`, `ui_schema_validation_results`, `ui_contract_drift_results`, `ui_admin_activity_log` | 5 |
| 0125 | `feature_flags_experiments.sql` | §17 Flags | `ui_feature_flags`, `ui_feature_flag_assignments`, `ui_experiments`, `ui_experiment_variants`, `ui_experiment_assignments`, `ui_rollout_rules`, `ui_kill_switches` | 7 |
| 0126 | `telemetry_render.sql` | §18 Telemetry | `ui_page_view_events`, `ui_click_events`, `ui_command_events`, `ui_render_performance_events` | 4 |
| 0127 | `telemetry_analytics.sql` | §18 Telemetry | `ui_error_events`, `ui_widget_usage_events`, `ui_search_events`, `ui_funnel_events`, `ui_retention_snapshots` | 5 |
| 0128 | `ai_workspace.sql` | §19 AI | `ui_ai_context_panels`, `ui_ai_suggestions`, `ui_ai_suggestion_feedback`, `ui_ai_action_drafts`, `ui_ai_workspace_memory`, `ui_ai_prompt_templates`, `ui_ai_tool_surface_bindings` | 7 |
| 0129 | `manager_studio_core.sql` | §20 Studio | `ui_manager_projects`, `ui_manager_drafts`, `ui_manager_locks`, `ui_manager_review_comments` | 4 |
| 0130 | `manager_studio_runs.sql` | §20 Studio | `ui_manager_validation_runs`, `ui_manager_preview_sessions`, `ui_manager_import_jobs`, `ui_manager_export_jobs` | 4 |

**Total: 121 tables across 31 migrations.**

Combined with the 31 tables already migrated in 0302–0306, this completes the **152-table** UI-OS surface (master checklist target ≈130; the +22 delta is composed columns split into separate tables for normalization — e.g. widget visibility rules separated from the widget instance row).

---

## Per-table schema sketch

For each migration below: PK, NN columns, UNIQUE constraints, FKs. Boilerplate (`tenant_id`, audit timestamps, `is_active`) **omitted** for brevity but always present per the canonical convention above.

### 0100 — widget_instances.sql  *(§5 Widgets)*
- **`ui_widget_instances`** — instance of a catalog widget on a dashboard/page
  - `widget_catalog_id UUID NOT NULL` → `dynamic_ui_widgets.id`
  - `instance_key VARCHAR(150) NOT NULL`
  - `dashboard_id UUID` → `ui_dashboards.id ON DELETE CASCADE`
  - `page_layout_id UUID` → `ui_page_layouts.id ON DELETE CASCADE`
  - `position_config JSONB NOT NULL DEFAULT '{}'`
  - `data_binding_id UUID` (set later by 0101)
  - UNIQUE `(tenant_id, instance_key)`
- **`ui_widget_instance_permissions`** — per-instance permission overrides
  - `widget_instance_id UUID NOT NULL` → `ui_widget_instances.id ON DELETE CASCADE`
  - `permission_code VARCHAR(150) NOT NULL`
  - `effect VARCHAR(10) NOT NULL CHECK (effect IN ('allow','deny'))`
  - `role_code VARCHAR(100)` NULL
  - `user_id VARCHAR(64)` NULL
  - UNIQUE `(widget_instance_id, permission_code, COALESCE(role_code,''), COALESCE(user_id,''))`

### 0101 — widget_data_lifecycle.sql
- **`ui_widget_data_bindings`** — API/data source binding
  - `widget_instance_id UUID NOT NULL` → `ui_widget_instances.id ON DELETE CASCADE`
  - `binding_kind VARCHAR(40) NOT NULL` (`rest`, `graphql`, `static`, `temporal_workflow`, `ai_query`)
  - `endpoint_url TEXT`
  - `request_template JSONB NOT NULL DEFAULT '{}'`
  - `response_mapping JSONB NOT NULL DEFAULT '{}'`
- **`ui_widget_refresh_policies`** — refresh interval + invalidation rules
  - `widget_instance_id UUID NOT NULL` → CASCADE
  - `interval_seconds INTEGER NOT NULL CHECK (interval_seconds >= 0)`
  - `refresh_on_event_codes TEXT[] NOT NULL DEFAULT '{}'`
  - `pause_when_hidden BOOLEAN NOT NULL DEFAULT true`
- **`ui_widget_error_states`** — fallback rendering on data error
  - `widget_instance_id UUID NOT NULL` → CASCADE
  - `error_code VARCHAR(100) NOT NULL`
  - `fallback_component_key VARCHAR(150)`
  - `message_key VARCHAR(150)`
  - `retry_strategy VARCHAR(40) NOT NULL DEFAULT 'manual'` (`manual`, `linear`, `exponential`)

### 0102 — widget_visibility_personalization.sql
- **`ui_widget_visibility_rules`** — show/hide logic
  - `widget_instance_id UUID NOT NULL` → CASCADE
  - `rule_kind VARCHAR(40) NOT NULL` (`permission`, `role`, `feature_flag`, `expression`, `module_status`)
  - `rule_payload JSONB NOT NULL DEFAULT '{}'`
- **`ui_widget_personalization`** — per-user widget settings
  - `widget_instance_id UUID NOT NULL` → CASCADE
  - `user_id VARCHAR(64) NOT NULL`
  - `personalization JSONB NOT NULL DEFAULT '{}'`
  - UNIQUE `(widget_instance_id, user_id)`
- **`ui_widget_catalog_categories`** — admin grouping for the catalog
  - `category_code VARCHAR(100) NOT NULL`
  - `parent_category_code VARCHAR(100) NULL`
  - `display_order INTEGER NOT NULL DEFAULT 0`
  - UNIQUE `(tenant_id, category_code)`

### 0103 — grid_columns.sql  *(§6 Grids)*
- **`ui_data_grid_column_catalog`** — declared columns per grid_key
  - `grid_key VARCHAR(150) NOT NULL`
  - `column_key VARCHAR(100) NOT NULL`
  - `data_type VARCHAR(40) NOT NULL`
  - `cell_renderer_key VARCHAR(150)` → matches `GRID_CELL_COMPONENT_MAP` allowlist
  - `is_sortable / is_filterable / is_editable BOOLEAN NOT NULL DEFAULT …`
  - UNIQUE `(tenant_id, grid_key, column_key)`
- **`ui_data_grid_column_permissions`** — per-role column visibility
  - `column_catalog_id UUID NOT NULL` → CASCADE
  - `permission_code VARCHAR(150) NOT NULL`
  - `effect VARCHAR(10) NOT NULL`

### 0104 — grid_views_exports.sql
- **`ui_data_grid_saved_views`** — view = filter+sort+columns+grouping
  - `grid_key VARCHAR(150) NOT NULL`
  - `view_key VARCHAR(150) NOT NULL`
  - `view_config JSONB NOT NULL DEFAULT '{}'`
  - `is_shared BOOLEAN NOT NULL DEFAULT false`
  - UNIQUE `(tenant_id, grid_key, view_key, COALESCE(user_id, '__shared__'))`
- **`ui_data_grid_exports`** — export job records
  - `grid_key`, `view_id UUID NULL`, `format VARCHAR(20)` (`csv`, `xlsx`, `pdf`), `row_count INTEGER`, `status VARCHAR(20)`, `started_at`, `completed_at`, `download_url TEXT`

### 0105 — grid_jobs_edits.sql
- **`ui_data_grid_bulk_jobs`** — bulk update/delete jobs
  - `grid_key`, `action_kind VARCHAR(40)`, `targets JSONB`, `status VARCHAR(20)`, `progress INTEGER NOT NULL DEFAULT 0`, `error JSONB`
- **`ui_data_grid_inline_edit_sessions`** — short-lived edit sessions
  - `session_key VARCHAR(64) NOT NULL UNIQUE`, `grid_key`, `row_pk JSONB`, `expires_at TIMESTAMPTZ`
- **`ui_data_grid_validation_errors`** — last validation failure per cell
  - `inline_edit_session_id UUID NOT NULL` → CASCADE, `column_key`, `error_code`, `message_key`

### 0106 — form_definitions.sql  *(§7 Forms)*
- **`ui_form_definitions`** — top-level form
  - `form_key VARCHAR(150)`, `version INTEGER NOT NULL DEFAULT 1`, `module_code`, `entity_kind VARCHAR(100)`, `submit_workflow_code VARCHAR(150)`, UNIQUE `(tenant_id, form_key, version)`
- **`ui_form_sections`** — form sections
  - `form_definition_id UUID NOT NULL` → CASCADE, `section_key VARCHAR(150)`, `display_order INTEGER`, `title_key`, UNIQUE `(form_definition_id, section_key)`
- **`ui_form_fields`** — fields
  - `form_section_id UUID NOT NULL` → CASCADE, `field_key VARCHAR(150)`, `field_kind VARCHAR(40)` → matches `FORM_FIELD_COMPONENT_MAP`, `display_order INTEGER`, `label_key`, `help_key`, UNIQUE `(form_section_id, field_key)`

### 0107 — form_rules.sql
- **`ui_form_field_rules`** — show/hide/disable based on other fields
  - `form_field_id UUID NOT NULL` → CASCADE, `rule_kind VARCHAR(40)` (`visible_when`, `required_when`, `enabled_when`, `value_when`), `expression JSONB`
- **`ui_form_validation_rules`** — validations
  - `form_field_id UUID NOT NULL` → CASCADE, `validator_kind VARCHAR(40)` (`required`, `pattern`, `range`, `custom`), `params JSONB`, `message_key`
- **`ui_form_default_values`** — defaults (static or expression)
  - `form_field_id UUID NOT NULL` → CASCADE, `default_kind VARCHAR(20)` (`static`, `expression`, `from_user`, `from_tenant`), `value JSONB`

### 0108 — form_runtime.sql
- **`ui_form_submissions`** — committed submissions
  - `form_definition_id UUID NOT NULL`, `submitter_user_id`, `payload JSONB`, `status VARCHAR(20)`, `submitted_at`, FK to entity captured via `entity_kind + entity_id` columns
- **`ui_form_drafts`** — autosaved drafts
  - `form_definition_id UUID NOT NULL`, `user_id`, `payload JSONB`, `last_autosave_at`, UNIQUE `(form_definition_id, user_id, COALESCE(entity_id::text, ''))`
- **`ui_form_attachments`** — file attachments
  - `form_submission_id UUID NULL` (or draft_id), `file_name`, `mime_type`, `size_bytes BIGINT`, `storage_url TEXT`, `checksum VARCHAR(128)`
- **`ui_form_approval_links`** — link to workflow approvals
  - `form_submission_id UUID NOT NULL` → CASCADE, `workflow_run_id UUID`, `approval_step_code VARCHAR(150)`, `decision VARCHAR(20)`, `decided_by`, `decided_at`

### 0109 — search_topology.sql  *(§8 Search)*
- **`ui_search_providers`** — pluggable backends (`pg_trgm`, `meilisearch`, `opensearch`, `ai_semantic`)
  - `provider_code VARCHAR(100)`, `endpoint_url`, `auth_secret_ref`, UNIQUE `(tenant_id, provider_code)`
- **`ui_search_indexes`** — logical indexes
  - `index_code VARCHAR(150)`, `provider_id UUID NOT NULL`, `module_code`, `last_built_at`
- **`ui_search_scopes`** — what indexes are searched in which surfaces
  - `scope_code VARCHAR(150)`, `index_codes TEXT[] NOT NULL`, `default_filters JSONB NOT NULL DEFAULT '{}'`

### 0110 — search_runtime.sql
- **`ui_search_history`** — per-user search log (size-bounded, TTL)
  - `user_id`, `scope_code`, `query_text`, `result_count INTEGER`, `searched_at TIMESTAMPTZ`
- **`ui_search_saved_queries`** — bookmarked searches
  - `user_id`, `scope_code`, `query_payload JSONB`, `name_key`
- **`ui_command_execution_log`** — command palette audit
  - `user_id`, `command_key`, `payload JSONB`, `result VARCHAR(20)`, `duration_ms INTEGER`, `executed_at`

### 0111 — notification_center.sql  *(§9 Notifications)*
- **`ui_notification_center_items`** — toast/notification rows
  - `recipient_user_id`, `category VARCHAR(40)`, `severity VARCHAR(20)`, `title_key`, `body_key`, `payload JSONB`, `link_url`, `expires_at`
- **`ui_notification_preferences`** — per-user channel prefs
  - `user_id`, `channel VARCHAR(20)` (`in_app`, `email`, `sms`, `push`), `category`, `enabled BOOLEAN`, `digest_window VARCHAR(20)` (`instant`, `hourly`, `daily`)
- **`ui_notification_read_state`** — read/unread + dismissed
  - `notification_id UUID NOT NULL` → CASCADE, `user_id`, `read_at`, `dismissed_at`, UNIQUE `(notification_id, user_id)`

### 0112 — inbox.sql
- **`ui_inbox_views`** — saved inbox filters
  - `user_id`, `view_key`, `filters JSONB`
- **`ui_inbox_rules`** — auto-categorize / auto-assign
  - `rule_key`, `match_expression JSONB`, `action JSONB`, `is_enabled BOOLEAN`
- **`ui_inbox_snoozes`** — snoozed items
  - `notification_id UUID NOT NULL`, `user_id`, `snooze_until TIMESTAMPTZ`, UNIQUE `(notification_id, user_id)`
- **`ui_inbox_assignments`** — assigned to teammate
  - `notification_id`, `assigner_user_id`, `assignee_user_id`, `assigned_at`, `note`

### 0113 — help_articles.sql  *(§10 Help)*
- **`ui_help_articles`** — knowledge-base articles
  - `slug VARCHAR(200) UNIQUE per tenant`, `locale VARCHAR(20)`, `title_key`, `body_md TEXT`, `published_at`
- **`ui_help_collections`** — grouping
  - `collection_key`, `display_order`, `title_key`
- **`ui_contextual_help_links`** — context → article binding
  - `route_key OR widget_instance_id OR action_code`, `help_article_id UUID NOT NULL`, `display_kind VARCHAR(20)` (`tooltip`, `popover`, `panel`)

### 0114 — onboarding_progress.sql
- **`ui_empty_state_content`** — empty state per route/grid
  - `surface_key VARCHAR(200)`, `title_key`, `body_key`, `cta_action_code`
- **`ui_checklists`** — onboarding lists
  - `checklist_key`, `audience VARCHAR(40)` (`new_tenant`, `new_user`, `role:<code>`), `steps JSONB`
- **`ui_user_checklist_progress`** — per-user step status
  - `checklist_id`, `user_id`, `step_key`, `status VARCHAR(20)`, `completed_at`, UNIQUE `(checklist_id, user_id, step_key)`
- **`ui_release_notes`** — release banners
  - `version VARCHAR(40)`, `published_at`, `title_key`, `body_md TEXT`
- **`ui_user_release_notes_read`** — per-user dismiss
  - `release_note_id`, `user_id`, `read_at`, UNIQUE `(release_note_id, user_id)`

### 0115 — theme_runtime.sql  *(§11 Branding)*
- **`ui_theme_profiles`** — named themes (`light`, `dark`, `tenant-x-custom`)
  - `profile_code VARCHAR(100)`, `parent_profile_code VARCHAR(100)`, `display_name_key`, UNIQUE `(tenant_id, profile_code)`
- **`ui_theme_tokens`** — token overrides per profile
  - `theme_profile_id UUID NOT NULL`, `token_key VARCHAR(150)`, `token_value TEXT`, `token_kind VARCHAR(20)` (`color`, `radius`, `shadow`, `spacing`, `typography`), UNIQUE `(theme_profile_id, token_key)`
- **`ui_theme_assignments`** — who gets which theme
  - `target_kind VARCHAR(20)` (`tenant`, `role`, `user`), `target_id`, `theme_profile_id UUID NOT NULL`

### 0116 — brand_assets.sql
- **`ui_brand_assets`** — logos, favicons, hero images
  - `asset_kind VARCHAR(40)`, `variant VARCHAR(40)` (`light`, `dark`, `mobile`, `email`), `url TEXT`, `mime_type`, `width INTEGER`, `height INTEGER`
- **`ui_login_branding`** — login page customization
  - `tenant_id`, `hero_asset_id`, `welcome_text_key`, `support_link`, UNIQUE `(tenant_id)`
- **`ui_email_branding`** — email header/footer/colors
  - `tenant_id UNIQUE`, `header_html`, `footer_html`, `accent_color VARCHAR(20)`
- **`ui_report_branding`** — PDF report cover/footer
  - `tenant_id UNIQUE`, `cover_template_html`, `watermark_text`, `legal_footer`
- **`ui_print_templates`** — printable template registry
  - `template_key`, `engine VARCHAR(20)` (`html`, `latex`), `template_body TEXT`, `default_locale`

### 0117 — i18n_governance.sql  *(§12 i18n)*
- **`ui_translation_namespaces`** — group keys (`foundation`, `vendor`, `risk`)
  - `namespace_code VARCHAR(100)`, `description`, UNIQUE `(tenant_id, namespace_code)`
- **`ui_translation_versions`** — semver of translation bundle per locale
  - `locale`, `namespace_code`, `version VARCHAR(40)`, `published_at`, `is_current BOOLEAN`
- **`ui_translation_overrides`** — per-tenant string override
  - `locale`, `namespace_code`, `key`, `value TEXT`, UNIQUE `(tenant_id, locale, namespace_code, key)`
- **`ui_locale_user_preferences`** — explicit user override of locale
  - `user_id UNIQUE per tenant`, `locale VARCHAR(20)`, `direction VARCHAR(8)`, `timezone VARCHAR(64)`
- **`ui_rtl_validation_results`** — last RTL coverage scan
  - `route_key OR component_key`, `passed BOOLEAN`, `findings JSONB`, `validated_at`

### 0118 — accessibility_device.sql  *(§13 A11y)*
- **`ui_accessibility_preferences`** — top-level a11y prefs
  - `user_id UNIQUE per tenant`, `screen_reader_optimized BOOLEAN`, `keyboard_only BOOLEAN`, `caption_required BOOLEAN`, `tab_order_strict BOOLEAN`
- **`ui_reduced_motion_preferences`** — motion
  - `user_id UNIQUE per tenant`, `reduce_motion BOOLEAN`, `disable_parallax BOOLEAN`
- **`ui_contrast_preferences`** — contrast level
  - `user_id UNIQUE per tenant`, `contrast_mode VARCHAR(20)` (`default`, `high`, `inverted`)
- **`ui_font_scale_preferences`** — font scaling
  - `user_id UNIQUE per tenant`, `scale_percent INTEGER NOT NULL DEFAULT 100 CHECK (scale_percent BETWEEN 75 AND 200)`
- **`ui_device_preferences`** — desktop vs mobile prefs
  - `user_id`, `device_kind VARCHAR(20)`, `prefers_compact BOOLEAN`, UNIQUE `(tenant_id, user_id, device_kind)`
- **`ui_device_sessions`** — device session log
  - `user_id`, `device_id VARCHAR(120)`, `user_agent TEXT`, `last_seen_at`, UNIQUE `(tenant_id, device_id)`
- **`ui_viewport_profiles`** — known viewport sizes for layout snap
  - `profile_code VARCHAR(40)`, `min_width_px INTEGER`, `max_width_px INTEGER`, `breakpoint_kind VARCHAR(20)`

### 0119 — webos_window_panels.sql  *(§14 WebOS)*
- **`ui_workspace_sessions`** — desktop-style session
  - `user_id`, `started_at`, `last_active_at`, `client_id VARCHAR(120)`
- **`ui_window_states`** — open windows in session
  - `workspace_session_id UUID NOT NULL` → CASCADE, `window_key VARCHAR(150)`, `route_key`, `position JSONB`, `z_index INTEGER`
- **`ui_panel_states`** — sidebars/panels open
  - `workspace_session_id UUID NOT NULL` → CASCADE, `panel_key VARCHAR(150)`, `is_pinned BOOLEAN`, `width_px INTEGER`
- **`ui_tab_states`** — tabs within a window
  - `window_state_id UUID NOT NULL` → CASCADE, `tab_key`, `tab_order INTEGER`, `is_active BOOLEAN`

### 0120 — webos_drag_clipboard.sql
- **`ui_split_view_states`** — split panes
  - `window_state_id`, `orientation VARCHAR(10)`, `split_ratio NUMERIC(4,3)`, `pane_a_route_key`, `pane_b_route_key`
- **`ui_drag_drop_layout_events`** — audit log of drag operations
  - `user_id`, `source_kind`, `target_kind`, `payload JSONB`, `accepted BOOLEAN`, `occurred_at`
- **`ui_clipboard_items`** — internal clipboard (TTL)
  - `user_id`, `item_kind VARCHAR(40)`, `payload JSONB`, `expires_at`
- **`ui_workspace_restore_points`** — auto-restore points beyond §14 snapshots
  - `user_id`, `point_kind VARCHAR(40)`, `state_payload JSONB`, `created_at`

### 0121 — visibility_permission.sql  *(§15 Security)*
- **`ui_visibility_rules`** — generic show/hide rules attached to anything
  - `target_kind VARCHAR(40)`, `target_id UUID`, `rule_kind VARCHAR(40)`, `rule_payload JSONB`
- **`ui_permission_bindings`** — bind a permission to a UI artifact
  - `target_kind`, `target_id UUID`, `permission_code VARCHAR(150)`, UNIQUE `(target_kind, target_id, permission_code)`
- **`ui_policy_evaluation_log`** — audit of policy checks (sample, not all)
  - `user_id`, `policy_kind`, `target_kind`, `target_id`, `effect VARCHAR(10)`, `reason VARCHAR(150)`, `evaluated_at`
- **`ui_denied_render_log`** — UI render denials (sample)
  - `user_id`, `target_kind`, `target_id`, `denied_at`, `reason_code`

### 0122 — role_assignments.sql
- **`ui_role_layout_assignments`** — role → layout
  - `role_code VARCHAR(100)`, `layout_template_id UUID`, UNIQUE `(tenant_id, role_code, layout_template_id)`
- **`ui_role_dashboard_assignments`** — role → dashboard
  - `role_code`, `dashboard_id UUID`, `is_default BOOLEAN`, UNIQUE `(tenant_id, role_code, dashboard_id)`
- **`ui_role_navigation_assignments`** — role → nav scope
  - `role_code`, `nav_node_key VARCHAR(150)`, UNIQUE `(tenant_id, role_code, nav_node_key)`

### 0123 — governance_publish.sql  *(§16 Governance)*
- **`ui_change_log`** — every UI config change
  - `actor_id`, `target_kind`, `target_id`, `change_kind VARCHAR(20)` (`create`, `update`, `delete`, `publish`, `rollback`), `before JSONB`, `after JSONB`, `changed_at`
- **`ui_publish_requests`** — request to promote draft → published
  - `target_kind`, `target_id`, `requester_id`, `summary`, `status VARCHAR(20)` (`pending`, `approved`, `rejected`, `cancelled`)
- **`ui_publish_approvals`** — approvals on a publish request
  - `publish_request_id`, `approver_id`, `decision`, `note`, `decided_at`
- **`ui_published_versions`** — current published snapshot
  - `target_kind`, `target_id`, `version VARCHAR(40)`, `payload JSONB`, `published_at`, UNIQUE `(target_kind, target_id, version)`

### 0124 — governance_drafts_audit.sql
- **`ui_draft_versions`** — drafts not yet published
  - `target_kind`, `target_id`, `version VARCHAR(40)`, `payload JSONB`, `author_id`, `created_at`
- **`ui_rollback_points`** — revertable points
  - `target_kind`, `target_id`, `version VARCHAR(40)`, `payload JSONB`, `created_at`
- **`ui_schema_validation_results`** — schema-shape audit
  - `subject_kind`, `subject_id`, `passed BOOLEAN`, `findings JSONB`, `validated_at`
- **`ui_contract_drift_results`** — DB vs code/contract drift
  - `subject_kind`, `subject_id`, `drift_kind`, `delta JSONB`, `detected_at`
- **`ui_admin_activity_log`** — admin action audit (lightweight)
  - `actor_id`, `action_code`, `payload JSONB`, `occurred_at`

### 0125 — feature_flags_experiments.sql  *(§17 Flags)*
- **`ui_feature_flags`** — flag definitions
  - `flag_code VARCHAR(150) UNIQUE per tenant`, `default_value JSONB`, `description`
- **`ui_feature_flag_assignments`** — assignments per scope
  - `flag_id UUID NOT NULL`, `target_kind VARCHAR(20)` (`tenant`, `role`, `user`), `target_id`, `value JSONB`, UNIQUE `(flag_id, target_kind, target_id)`
- **`ui_experiments`** — experiment definitions
  - `experiment_code VARCHAR(150) UNIQUE per tenant`, `hypothesis`, `metric_keys TEXT[]`, `started_at`, `ended_at`
- **`ui_experiment_variants`** — variants
  - `experiment_id`, `variant_code`, `traffic_pct INTEGER CHECK (traffic_pct BETWEEN 0 AND 100)`, UNIQUE `(experiment_id, variant_code)`
- **`ui_experiment_assignments`** — sticky user→variant assignment
  - `experiment_id`, `user_id`, `variant_code`, UNIQUE `(experiment_id, user_id)`
- **`ui_rollout_rules`** — gradual rollout
  - `flag_id OR experiment_id`, `rule_kind VARCHAR(40)`, `rule_payload JSONB`, `priority INTEGER`
- **`ui_kill_switches`** — emergency disable
  - `switch_code VARCHAR(150) UNIQUE per tenant`, `is_active BOOLEAN`, `reason`, `triggered_by`, `triggered_at`

### 0126 — telemetry_render.sql  *(§18 Telemetry)*
> ⚠️ Telemetry tables: store **structured event metadata only**. No PII or sensitive payloads. Per master checklist warning. Add a partial index on `(tenant_id, occurred_at DESC)` for time-series scans.
- **`ui_page_view_events`** — `route_key`, `referrer_route_key`, `duration_ms`, `viewport_kind`, `occurred_at`
- **`ui_click_events`** — `target_kind`, `target_id`, `action_code`, `occurred_at`
- **`ui_command_events`** — `command_key`, `surface VARCHAR(40)` (`palette`, `shortcut`, `menu`), `result`, `occurred_at`
- **`ui_render_performance_events`** — `route_key`, `lcp_ms`, `inp_ms`, `cls`, `tbt_ms`, `occurred_at`

### 0127 — telemetry_analytics.sql
- **`ui_error_events`** — `route_key`, `error_code`, `error_kind` (`render`, `api`, `permission`), `stack_hash VARCHAR(64)`, `occurred_at`. **No raw stack.**
- **`ui_widget_usage_events`** — `widget_instance_id`, `interaction VARCHAR(40)`, `duration_ms`, `occurred_at`
- **`ui_search_events`** — `scope_code`, `query_hash VARCHAR(64)`, `result_count`, `clicked_position INTEGER`, `occurred_at`
- **`ui_funnel_events`** — `funnel_code`, `step_code`, `user_id_hash VARCHAR(64)`, `occurred_at`
- **`ui_retention_snapshots`** — `cohort_code`, `day_index INTEGER`, `active_user_count INTEGER`, `snapshot_at`

### 0128 — ai_workspace.sql  *(§19 AI)*
> Overlaps `public.ai_drafts` — see project_aios_p1_closures memory. Plan: keep `public.ai_drafts` for engine-side runtime; UI-OS ai tables are about **panel placement, prompts, and feedback**, not draft outputs.
- **`ui_ai_context_panels`** — visible AI panels per route
  - `route_key`, `position VARCHAR(20)` (`left`, `right`, `bottom`, `floating`), `default_open BOOLEAN`
- **`ui_ai_suggestions`** — surfaced suggestions
  - `user_id`, `surface VARCHAR(40)`, `suggestion_kind`, `payload JSONB`, `shown_at`
- **`ui_ai_suggestion_feedback`** — accept/reject/ignored
  - `suggestion_id`, `user_id`, `decision VARCHAR(20)`, `comment`, `decided_at`
- **`ui_ai_action_drafts`** — drafted actions awaiting confirm (UI-side; mirrors public.ai_drafts metadata)
  - `user_id`, `action_code`, `params JSONB`, `state VARCHAR(20)`, `linked_engine_draft_id UUID NULL`
- **`ui_ai_workspace_memory`** — stable per-user workspace memory items
  - `user_id`, `memory_key VARCHAR(150)`, `value JSONB`, `expires_at`, UNIQUE `(tenant_id, user_id, memory_key)`
- **`ui_ai_prompt_templates`** — prompt templates exposed to UI
  - `template_key VARCHAR(150) UNIQUE per tenant`, `body TEXT`, `model_hint`, `tool_codes TEXT[]`
- **`ui_ai_tool_surface_bindings`** — which tools a surface exposes
  - `surface_key`, `tool_code VARCHAR(150)`, `effect VARCHAR(10)` (`allow`, `deny`)

### 0129 — manager_studio_core.sql  *(§20 UI Manager Studio)*
- **`ui_manager_projects`** — admin editing project (collection of drafts)
  - `project_key VARCHAR(150) UNIQUE per tenant`, `name`, `owner_user_id`
- **`ui_manager_drafts`** — multi-target draft set
  - `project_id UUID NOT NULL` → CASCADE, `target_kind`, `target_id`, `payload JSONB`, `state VARCHAR(20)`
- **`ui_manager_locks`** — pessimistic lock on a target
  - `target_kind`, `target_id`, `locked_by_user_id`, `locked_at`, `expires_at`, UNIQUE `(target_kind, target_id)`
- **`ui_manager_review_comments`** — review comments on drafts
  - `draft_id UUID NOT NULL`, `author_id`, `body TEXT`, `resolved BOOLEAN`, `created_at`

### 0130 — manager_studio_runs.sql
- **`ui_manager_validation_runs`** — validation history per project
  - `project_id`, `kind VARCHAR(40)` (`schema`, `contract`, `allowlist`, `i18n`, `rtl`, `a11y`, `permission`), `passed BOOLEAN`, `findings JSONB`, `ran_at`
- **`ui_manager_preview_sessions`** — live preview tokens
  - `project_id`, `token VARCHAR(80) UNIQUE`, `created_by_user_id`, `expires_at`
- **`ui_manager_import_jobs`** — bulk import (e.g. translation CSV)
  - `kind`, `source_url`, `status`, `progress INTEGER`, `error JSONB`, `started_at`, `completed_at`
- **`ui_manager_export_jobs`** — bulk export
  - `kind`, `target_format VARCHAR(20)`, `download_url TEXT`, `status`, `started_at`, `completed_at`

---

## Apply gating strategy

Each migration file ships in **draft mode** (`-- dos:draft` header on line 1) so [migration-runner.ts:78-95](../../platform/config-center/migration/migration-runner.ts) refuses to apply it. Promotion path:

1. **Reservation** — file lands in `platform/dos/migrations/public/` with draft header. Reviewable; runner skips with reason `"draft (-- dos:draft header)"`.
2. **Schema review** — author opens PR removing only the draft header. Reviewer checks: UUID PK, tenant_id, audit cols, FK targets, indexes, no surprise columns.
3. **Apply gate** — once chassis (manager + API + RBAC + RLS + audit) for that section is shipped per [ui-os-gap-closure-plan.md](./ui-os-gap-closure-plan.md), a separate PR removes the draft header **and** registers the file in [migrations-index.json](../../platform/dos/migrations/migrations-index.json).
4. **Apply** — runner picks it up on next `up`, records in `dos.platform_migrations`.
5. **Down parity test** — same as step 0.2 of the gap-closure plan: apply down → up against `dos_migration_validate`, pg_dump diff must be empty.

This way **schemas exist as reviewable code without risk to any database** until the runtime is ready.

---

## Wave assignment (apply order, not file order)

| Wave | Migrations | Why this wave |
|---|---|---|
| W3 — widgets/grids/forms | 0100, 0101, 0102, 0103, 0104, 0105, 0106, 0107, 0108 | First user-facing extension; consumed by existing dashboards/grids |
| W4 — branding/i18n/help | 0113, 0114, 0115, 0116, 0117 | Tenant-customization stack; unblocks white-label deals |
| W5 — governance/security | 0121, 0122, 0123, 0124 | Required before any **write** path on existing layout/widget tables can publish |
| W6 — flags/search/notifications | 0109, 0110, 0111, 0112, 0125 | Operational levers |
| W7 — AI workspace | 0128 | Wave-3 chassis must exist first |
| W8 — WebOS/a11y/device | 0118, 0119, 0120 | "Do not implement before normal workspace stable" — last functional wave |
| W9 — telemetry | 0126, 0127 | Final, low-risk; emit-only |
| W10 — UI Manager Studio | 0129, 0130 | Admin-only; gates all of W3–W9 administration |

**Apply order ≠ file order.** Files are numbered by topic adjacency for code-review locality, then promoted out-of-order per wave above.

---

## File template (shipped as `_template.sql`, not applied)

```sql
-- dos:draft
-- =====================================================================
-- UI-OS — <SECTION> — <SHORT_DESCRIPTION>  (20260502_<NNNN>)
--
-- Master checklist §<N> "<section_name>" coverage (subset).
-- Tables created (<COUNT>):
--   1. dos.<table_a>
--   2. dos.<table_b>
--   ...
--
-- Conventions: docs/migration/ui-os-tables-0100-0130-plan.md
--   - id UUID PK gen_random_uuid()
--   - tenant_id VARCHAR(64) NOT NULL (indexed)
--   - audit cols: created_by, updated_by, created_at, updated_at
--   - is_active BOOLEAN NOT NULL DEFAULT true
--   - i18n via *_key columns, never raw strings
--
-- DO NOT REMOVE the `-- dos:draft` header without (a) wave gate ack
-- and (b) registering this file in migrations-index.json.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.<table_a> (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  -- ... business columns ...
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_<table_a>_tenant
  ON dos.<table_a> (tenant_id);

-- repeat for table_b, table_c ...

COMMIT;
```

Each `<NNNN>.sql` ships with a paired `<NNNN>_down.sql` containing `DROP TABLE IF EXISTS dos.<table_*> CASCADE;` in **reverse FK order** wrapped in `BEGIN;…COMMIT;`.

---

## Acceptance per migration

Before a draft header is removed:

- [ ] Up SQL parses and applies clean against `dos_migration_validate` (run `psql -v ON_ERROR_STOP=1 -f`)
- [ ] Down SQL reverses cleanly; `pg_dump --schema-only --schema=dos` diff before/after round-trip is empty
- [ ] Every table has UUID PK, `tenant_id`, audit cols, `is_active`
- [ ] Every UNIQUE constraint accounts for nullable columns via `COALESCE(...)` or `NULLS NOT DISTINCT` (per `feedback_platform_db_gotchas`)
- [ ] FKs use `ON DELETE CASCADE` for owned children, `ON DELETE SET NULL` for soft refs
- [ ] At least one `(tenant_id)` btree index per table
- [ ] No raw string columns where an i18n key is appropriate
- [ ] No PII/secret columns in telemetry-class tables
- [ ] File is registered in `migrations-index.json` **only** when promoted out of draft

---

## Out of scope (this plan)

- RLS policy creation — Phase 1.1 of [ui-os-gap-closure-plan.md](./ui-os-gap-closure-plan.md), separate migration set numbered `0200–0230` after each `0100–0130` is applied.
- Per-tenant data migration — only platform `dos` schema for these tables.
- Seed data — separate seed scripts under `seeds/ui-os/`, applied after migrations.
- Manager / API / consumer wiring — handled by Phase 2 of the gap-closure plan, not by these DDL files.

---

## Next steps

1. ~~Generate the 31 draft `.sql` + 31 paired `_down.sql` files using the template above.~~ **DONE — 32 ups + 32 downs + 1 template under `platform/dos/migrations/public/_drafts/`** (0099 ENUMs migration added on top of 0100–0130).
2. ~~Generate `_template.sql` reference file.~~ **DONE.**
3. Add `migrations-index.json` placeholder section `"reservedDrafts"` listing the 32 files (so they're tracked but not applied). **PENDING.**
4. Land all of the above as **one PR titled** `ui-os: reserve table designs 0099–0130 (drafts, not applied)`.
5. Each subsequent PR promotes one wave's drafts → applied per the wave table above.

## Delivered (2026-05-01)

| Artifact | Count |
|---|---:|
| Draft up migrations | 32 (0099 + 0100–0130) |
| Draft down migrations | 32 |
| Reference template | 1 (`_template.sql`) |
| Tables defined | 126 |
| Postgres ENUM types defined (0099) | 39 |
| Direct ENUM column references in 0100–0130 | 65 |
| `CHECK (col IN (...))` on TEXT columns left | **0** (full DKNF promotion) |
| `TEXT[]` columns of first-class entities | **0** (all promoted to child tables: 5 of them) |
| Self-referential parents stored as `_id` (not `_code`) | 2 (`ui_widget_catalog_categories`, `ui_theme_profiles`) |

### 1NF child tables explicitly created to replace TEXT[] of first-class entities

| Parent | Original TEXT[] column | New child table | First-class registry |
|---|---|---|---|
| `ui_widget_instances` | `role_codes` | `ui_widget_instance_role_grants` | `public.roles` |
| `ui_search_scopes` | `index_codes` | `ui_search_scope_indexes` | `ui_search_indexes` |
| `ui_help_collections` | implicit slug list | `ui_help_collection_articles` | `ui_help_articles` |
| `ui_checklists` | `steps JSONB` (stable shape) | `ui_checklist_steps` | first-class |
| `ui_ai_prompt_templates` | `tool_codes` | `ui_ai_prompt_template_tools` | AI-OS tool registry |

### Acceptable TEXT[] kept (free-form tags, no registry)
- `ui_widget_refresh_policies.refresh_on_event_codes` — no event registry
- `ui_experiments.metric_keys` — no metric registry

Both annotated with promote-when-registry-arrives comment.
