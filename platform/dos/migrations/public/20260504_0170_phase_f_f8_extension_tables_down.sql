-- 0170 DOWN — drop F8 archetype data-extension tables.
BEGIN;
DROP TABLE IF EXISTS dos.ui_route_activation_step;
DROP TABLE IF EXISTS dos.ui_route_ai_recommendation;
DROP TABLE IF EXISTS dos.ui_route_audit_event;
DROP TABLE IF EXISTS dos.ui_route_work_task;
DROP TABLE IF EXISTS dos.ui_route_form_step;
DROP TABLE IF EXISTS dos.ui_route_record_timeline_event;
DROP TABLE IF EXISTS dos.ui_route_record_field;
DROP TABLE IF EXISTS dos.ui_route_heatmap_top_item;
DROP TABLE IF EXISTS dos.ui_route_heatmap_cell;
DROP TABLE IF EXISTS dos.ui_route_record_row;
DROP TABLE IF EXISTS dos.ui_route_ai_insight;
DROP TABLE IF EXISTS dos.ui_route_trend_series;
DROP TABLE IF EXISTS dos.ui_route_posture_score;
DROP TABLE IF EXISTS dos.ui_route_decision_item;
COMMIT;
