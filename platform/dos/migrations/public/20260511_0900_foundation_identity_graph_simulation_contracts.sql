-- 20260511_0900_foundation_identity_graph_simulation_contracts.sql
--
-- Wave 07: identity-graph + what-if simulation contracts (DB-first).
-- Adds route-scoped graph/simulation tables and seeds ownership-mapping.
--
-- Idempotent, additive, no destructive operations.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_route_identity_graph_node (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  node_type     TEXT NOT NULL,
  owner         TEXT,
  risk_level    TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(route, node_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_identity_graph_node_route
  ON dos.ui_route_identity_graph_node(route);

CREATE TABLE IF NOT EXISTS dos.ui_route_identity_graph_edge (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  edge_id       TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  source_node   TEXT NOT NULL,
  target_node   TEXT NOT NULL,
  relation      TEXT NOT NULL,
  confidence    NUMERIC(5,2),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(route, edge_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_identity_graph_edge_route
  ON dos.ui_route_identity_graph_edge(route);

CREATE TABLE IF NOT EXISTS dos.ui_route_policy_simulation_scenario (
  id                BIGSERIAL PRIMARY KEY,
  route             TEXT NOT NULL,
  scenario_id       TEXT NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  title_en          TEXT NOT NULL,
  title_ar          TEXT,
  assumption_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  impact_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_action JSONB,
  status            TEXT,
  UNIQUE(route, scenario_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_policy_simulation_route
  ON dos.ui_route_policy_simulation_scenario(route);

INSERT INTO dos.ui_route_identity_graph_node (
  route, node_id, sort_order, label_en, label_ar, node_type, owner, risk_level, metadata
)
VALUES
  ('/foundation/ownership-mapping', 'node-user-ciso', 10, 'CISO', 'مدير أمن المعلومات', 'user', 'security-office@grc', 'high', '{"department":"security"}'::jsonb),
  ('/foundation/ownership-mapping', 'node-role-policy-approver', 20, 'Policy Approver', 'معتمد السياسات', 'role', 'governance@grc', 'medium', '{"privileged":true}'::jsonb),
  ('/foundation/ownership-mapping', 'node-asset-policy-catalog', 30, 'Policy Catalog', 'كتالوج السياسات', 'asset', 'compliance@grc', 'medium', '{"domain":"governance"}'::jsonb),
  ('/foundation/ownership-mapping', 'node-control-sox', 40, 'SOX Control Set', 'مجموعة ضوابط SOX', 'control', 'internal-audit@grc', 'high', '{"framework":"SOX"}'::jsonb)
ON CONFLICT (route, node_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  node_type = EXCLUDED.node_type,
  owner = EXCLUDED.owner,
  risk_level = EXCLUDED.risk_level,
  metadata = EXCLUDED.metadata;

INSERT INTO dos.ui_route_identity_graph_edge (
  route, edge_id, sort_order, source_node, target_node, relation, confidence, metadata
)
VALUES
  ('/foundation/ownership-mapping', 'edge-1', 10, 'node-user-ciso', 'node-role-policy-approver', 'assigned_to', 0.98, '{"evidence":"role_assignment"}'::jsonb),
  ('/foundation/ownership-mapping', 'edge-2', 20, 'node-role-policy-approver', 'node-asset-policy-catalog', 'approves', 0.92, '{"evidence":"workflow"}'::jsonb),
  ('/foundation/ownership-mapping', 'edge-3', 30, 'node-asset-policy-catalog', 'node-control-sox', 'maps_to', 0.88, '{"evidence":"control_mapping"}'::jsonb)
ON CONFLICT (route, edge_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  source_node = EXCLUDED.source_node,
  target_node = EXCLUDED.target_node,
  relation = EXCLUDED.relation,
  confidence = EXCLUDED.confidence,
  metadata = EXCLUDED.metadata;

INSERT INTO dos.ui_route_policy_simulation_scenario (
  route, scenario_id, sort_order, title_en, title_ar, assumption_json, impact_json, recommended_action, status
)
VALUES
  (
    '/foundation/ownership-mapping',
    'sim-delegation-expiry',
    10,
    'What-if: high-risk delegation expires',
    'ماذا لو انتهى تفويض عالي المخاطر',
    '{"delegationId":"fd-3","event":"expires"}'::jsonb,
    '{"affectedApprovals":12,"riskDelta":"+18%","slaBreachProbability":"0.63"}'::jsonb,
    '{"kind":"open_context_tab","tab":"delegations"}'::jsonb,
    'ready'
  ),
  (
    '/foundation/ownership-mapping',
    'sim-policy-tightening',
    20,
    'What-if: tighten policy approval threshold',
    'ماذا لو شددنا حد الموافقة على السياسات',
    '{"control":"policy.approval.threshold","newValue":"dual-signoff"}'::jsonb,
    '{"affectedOwners":6,"approvalLatency":"+9h","riskDelta":"-11%"}'::jsonb,
    '{"kind":"dispatch_event","eventName":"policy.simulation.apply"}'::jsonb,
    'ready'
  )
ON CONFLICT (route, scenario_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  title_en = EXCLUDED.title_en,
  title_ar = EXCLUDED.title_ar,
  assumption_json = EXCLUDED.assumption_json,
  impact_json = EXCLUDED.impact_json,
  recommended_action = EXCLUDED.recommended_action,
  status = EXCLUDED.status;

DO $$
DECLARE
  n_nodes integer;
  n_edges integer;
  n_scenarios integer;
BEGIN
  SELECT COUNT(*) INTO n_nodes FROM dos.ui_route_identity_graph_node WHERE route='/foundation/ownership-mapping';
  SELECT COUNT(*) INTO n_edges FROM dos.ui_route_identity_graph_edge WHERE route='/foundation/ownership-mapping';
  SELECT COUNT(*) INTO n_scenarios FROM dos.ui_route_policy_simulation_scenario WHERE route='/foundation/ownership-mapping';

  IF n_nodes < 4 OR n_edges < 3 OR n_scenarios < 2 THEN
    RAISE EXCEPTION 'identity-graph/simulation assertion failed: nodes %, edges %, scenarios %', n_nodes, n_edges, n_scenarios;
  END IF;
END $$;

COMMIT;
