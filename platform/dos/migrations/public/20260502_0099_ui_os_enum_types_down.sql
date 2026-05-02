-- dos:draft
-- DOWN — UI-OS shared ENUM types  (20260502_0099)
-- WARNING: dropping a type that is referenced by any column will fail.
-- Run only after all tables that reference these types have been dropped
-- (i.e. after every paired _down.sql for 0100-0130 has run).
BEGIN;

DROP TYPE IF EXISTS dos.ui_manager_draft_state_t;
DROP TYPE IF EXISTS dos.ui_ai_action_draft_state_t;
DROP TYPE IF EXISTS dos.ui_ai_panel_position_t;
DROP TYPE IF EXISTS dos.ui_error_kind_t;
DROP TYPE IF EXISTS dos.ui_flag_target_kind_t;
DROP TYPE IF EXISTS dos.ui_publish_status_t;
DROP TYPE IF EXISTS dos.ui_change_kind_t;
DROP TYPE IF EXISTS dos.ui_target_kind_t;
DROP TYPE IF EXISTS dos.ui_command_surface_t;
DROP TYPE IF EXISTS dos.ui_split_orientation_t;
DROP TYPE IF EXISTS dos.ui_viewport_breakpoint_t;
DROP TYPE IF EXISTS dos.ui_device_kind_t;
DROP TYPE IF EXISTS dos.ui_contrast_mode_t;
DROP TYPE IF EXISTS dos.ui_locale_direction_t;
DROP TYPE IF EXISTS dos.ui_print_engine_t;
DROP TYPE IF EXISTS dos.ui_brand_asset_kind_t;
DROP TYPE IF EXISTS dos.ui_theme_target_kind_t;
DROP TYPE IF EXISTS dos.ui_theme_token_kind_t;
DROP TYPE IF EXISTS dos.ui_checklist_step_status_t;
DROP TYPE IF EXISTS dos.ui_contextual_help_display_t;
DROP TYPE IF EXISTS dos.ui_notification_digest_window_t;
DROP TYPE IF EXISTS dos.ui_notification_channel_t;
DROP TYPE IF EXISTS dos.ui_notification_severity_t;
DROP TYPE IF EXISTS dos.ui_form_decision_t;
DROP TYPE IF EXISTS dos.ui_form_submission_status_t;
DROP TYPE IF EXISTS dos.ui_form_default_kind_t;
DROP TYPE IF EXISTS dos.ui_form_validator_kind_t;
DROP TYPE IF EXISTS dos.ui_form_rule_kind_t;
DROP TYPE IF EXISTS dos.ui_form_field_kind_t;
DROP TYPE IF EXISTS dos.ui_job_status_t;
DROP TYPE IF EXISTS dos.ui_grid_export_format_t;
DROP TYPE IF EXISTS dos.ui_grid_column_capability_t;
DROP TYPE IF EXISTS dos.ui_grid_column_data_type_t;
DROP TYPE IF EXISTS dos.ui_retry_strategy_t;
DROP TYPE IF EXISTS dos.ui_http_method_t;
DROP TYPE IF EXISTS dos.ui_widget_binding_kind_t;
DROP TYPE IF EXISTS dos.ui_visibility_rule_kind_t;
DROP TYPE IF EXISTS dos.ui_visibility_effect_t;
DROP TYPE IF EXISTS dos.ui_perm_effect_t;

COMMIT;
