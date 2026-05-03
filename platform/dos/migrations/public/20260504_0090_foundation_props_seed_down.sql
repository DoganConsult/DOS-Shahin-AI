-- =====================================================================
-- 0090_down — Remove the 3-route foundation props seed.
-- =====================================================================
BEGIN;

DELETE FROM dos.ui_route_ownership_edge
 WHERE route = '/foundation/ownership';

DELETE FROM dos.ui_route_org_chart_node
 WHERE route = '/foundation/hierarchy-viz';

DELETE FROM dos.ui_route_workflow_timeline_step
 WHERE route = '/foundation/user-lifecycle';

COMMIT;
