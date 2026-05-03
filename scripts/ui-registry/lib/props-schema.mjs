/**
 * props-schema.mjs — per-archetype seed-file → SQL contract.
 *
 * Maps each of the 14 archetype-props tables (created by migration
 * 20260503_0020_phase_f_archetype_props_tables.sql) to:
 *   - the JSON top-level array key it expects in the seed file
 *   - the destination dos.ui_route_* table
 *   - the ordered column list the importer must INSERT
 *   - per-row validation (required keys + enum constraints) so a bad seed
 *     fails the importer BEFORE we ever produce a SQL migration.
 *
 * One source-of-truth used by `scripts/ui-registry/import-props.mjs` and the
 * `pnpm ui-registry:verify` cross-check.
 */

export const ARCHETYPE_PROPS_SCHEMA = {
  'calendar-timeline': {
    jsonKey: 'calendarEvents',
    table: 'dos.ui_route_calendar_event',
    cols: ['route','sort_order','event_id','title_en','title_ar','category','starts_at','ends_at','status','severity','link'],
    required: ['event_id','title_en','starts_at'],
  },
  'compliance-calendar': {
    jsonKey: 'calendarEvents',
    table: 'dos.ui_route_calendar_event',
    cols: ['route','sort_order','event_id','title_en','title_ar','category','starts_at','ends_at','status','severity','link'],
    required: ['event_id','title_en','starts_at'],
  },
  'remediation-roadmap': {
    jsonKey: 'roadmapMilestones',
    table: 'dos.ui_route_roadmap_milestone',
    cols: ['route','sort_order','milestone_id','title_en','title_ar','description','target_date','progress','status','owner'],
    required: ['milestone_id','title_en'],
    check: r => Number.isInteger(r.progress ?? 0) && (r.progress ?? 0) >= 0 && (r.progress ?? 0) <= 100
              ? null : 'progress must be 0..100',
  },
  'org-chart': {
    jsonKey: 'orgChartNodes',
    table: 'dos.ui_route_org_chart_node',
    cols: ['route','node_id','parent_id','sort_order','title_en','title_ar','role','owner','badge'],
    required: ['node_id','title_en'],
  },
  'ownership-map': {
    jsonKey: 'ownershipEdges',
    table: 'dos.ui_route_ownership_edge',
    cols: ['route','sort_order','edge_id','entity_id','entity_label','owner','ownership_role','effective_from','effective_to'],
    required: ['edge_id','entity_id','entity_label','owner','ownership_role'],
    enums: { ownership_role: ['accountable','responsible','consulted','informed','custodian','approver','reviewer','executor','observer'] },
  },
  'delegation-center': {
    jsonKey: 'delegationRules',
    table: 'dos.ui_route_delegation_rule',
    cols: ['route','sort_order','rule_id','delegator','delegate','scope','permission','starts_at','ends_at','status'],
    required: ['rule_id','delegator','delegate','scope','starts_at'],
  },
  'agent-registry': {
    jsonKey: 'agentRegistry',
    table: 'dos.ui_route_agent_registry',
    cols: ['route','sort_order','agent_id','name_en','name_ar','agent_type','capability','status','owner','ai_model'],
    required: ['agent_id','name_en'],
  },
  'user-agent-workbench': {
    jsonKey: 'agentRegistry',
    table: 'dos.ui_route_agent_registry',
    cols: ['route','sort_order','agent_id','name_en','name_ar','agent_type','capability','status','owner','ai_model'],
    required: ['agent_id','name_en'],
  },
  'agent-flow': {
    jsonKey: 'agentFlowSteps',
    table: 'dos.ui_route_agent_flow_step',
    cols: ['route','sort_order','step_id','label_en','label_ar','step_type','agent_id','status','evidence_uri'],
    required: ['step_id','label_en'],
  },
  'incident-response.runbook': {
    jsonKey: 'incidentRunbookSteps',
    table: 'dos.ui_route_incident_runbook_step',
    cols: ['route','sort_order','step_id','label_en','label_ar','phase','owner','due_at','status','evidence_uri'],
    required: ['step_id','label_en'],
  },
  'incident-response.communications': {
    jsonKey: 'incidentCommunications',
    table: 'dos.ui_route_incident_communication',
    cols: ['route','sort_order','comm_id','channel','audience','sent_at','message_en','message_ar'],
    required: ['comm_id','channel','audience','sent_at','message_en'],
  },
  'audit-trail-ledger': {
    jsonKey: 'auditLedgerRows',
    table: 'dos.ui_route_audit_ledger_row',
    cols: ['route','sort_order','ledger_id','occurred_at','actor','action','entity_type','entity_id','prev_hash','hash','decision_ref'],
    required: ['ledger_id','occurred_at','actor','action','hash'],
  },
  'audit-trail-evidence': {
    jsonKey: 'auditEvidenceArtifacts',
    table: 'dos.ui_route_audit_evidence_artifact',
    cols: ['route','sort_order','artifact_id','title_en','title_ar','artifact_type','hash','collected_at','collected_by','download_url'],
    required: ['artifact_id','title_en','collected_at'],
  },
  'follow-up-center': {
    jsonKey: 'followUpItems',
    table: 'dos.ui_route_follow_up_item',
    cols: ['route','sort_order','item_id','title_en','title_ar','origin_ref','owner','due_at','status','severity','ai_score'],
    required: ['item_id','title_en'],
  },
  'export-center': {
    jsonKey: 'exportArtifacts',
    table: 'dos.ui_route_export_artifact',
    cols: ['route','sort_order','artifact_id','title_en','title_ar','format','status','size_kb','download_url','generated_at'],
    required: ['artifact_id','title_en','format','status'],
    enums: { format: ['pdf','csv','xlsx','json'], status: ['ready','generating','failed'] },
  },
  'workflow-timeline': {
    jsonKey: 'workflowTimelineSteps',
    table: 'dos.ui_route_workflow_timeline_step',
    cols: ['route','sort_order','step_id','label_en','label_ar','state','description','occurred_at','actor'],
    required: ['step_id','label_en','state'],
    enums: { state: ['complete','current','incomplete','invalid','disabled'] },
  },
  'case-finalization': {
    jsonKey: 'cases',
    table: 'dos.ui_route_case_finalization',
    cols: ['route','sort_order','case_id','title_en','title_ar','case_type','origin_ref','decision','decision_owner','decision_at','signoff_status','evidence_uri','rationale_en','rationale_ar','next_review_at','status'],
    required: ['case_id','title_en'],
    enums: {
      decision: ['approve','reject','accept-risk','escalate','defer'],
      signoff_status: ['pending','partial','complete','rejected'],
      status: ['open','in-review','finalized','reopened'],
    },
  },
};

/**
 * Lift a single seed file's array → ready-to-write row list.
 *
 * Throws on any rule violation (missing required key / bad enum / bad shape)
 * so the importer fails BEFORE writing a migration.
 */
export function buildPropsRows(archetype, route, raw) {
  const candidates = [archetype];
  if (archetype === 'incident-response') candidates.push('incident-response.runbook','incident-response.communications');
  const out = [];
  for (const slot of candidates) {
    const schema = ARCHETYPE_PROPS_SCHEMA[slot];
    if (!schema) continue;
    const list = Array.isArray(raw?.[schema.jsonKey]) ? raw[schema.jsonKey] : [];
    list.forEach((row, idx) => {
      const r = { sort_order: idx, ...row, route };
      for (const k of schema.required) {
        if (r[k] === undefined || r[k] === null || r[k] === '') {
          throw new Error(`[${archetype} @ ${route}] row ${idx}: required key "${k}" missing`);
        }
      }
      if (schema.enums) {
        for (const [k, allowed] of Object.entries(schema.enums)) {
          if (r[k] !== undefined && r[k] !== null && !allowed.includes(r[k])) {
            throw new Error(`[${archetype} @ ${route}] row ${idx}: bad enum "${k}=${r[k]}" (allowed=${allowed.join('|')})`);
          }
        }
      }
      if (schema.check) {
        const err = schema.check(r);
        if (err) throw new Error(`[${archetype} @ ${route}] row ${idx}: ${err}`);
      }
      out.push({ schema, row: r });
    });
  }
  return out;
}

export function sqlLiteral(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
}
