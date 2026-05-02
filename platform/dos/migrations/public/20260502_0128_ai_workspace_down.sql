-- dos:draft
-- DOWN — UI-OS — §19 AI Workspace  (20260502_0128)
BEGIN;
DROP TABLE IF EXISTS dos.ui_ai_tool_surface_bindings CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_prompt_template_tools CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_prompt_templates CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_workspace_memory CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_action_drafts CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_suggestion_feedback CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_suggestions CASCADE;
DROP TABLE IF EXISTS dos.ui_ai_context_panels CASCADE;
COMMIT;
