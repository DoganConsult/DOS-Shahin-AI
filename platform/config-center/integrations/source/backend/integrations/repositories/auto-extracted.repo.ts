// Auto-extracted Integrations repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class IntegrationsAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".m365_evidence_items SET status = 'linked' WHERE item_id = $1`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".m365_evidence_items
     WHERE status = 'staged' ${filter}
     ORDER BY last_modified_at DESC NULLS LAST
     LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT asset_class, COUNT(*) AS cnt FROM "${schema}".cmdb_assets
     WHERE last_synced_at > NOW() - INTERVAL '2 hours' AND status = 'active' ${filter}
     GROUP BY asset_class ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".cmdb_assets
     WHERE criticality IN ('critical', 'high')
       AND status = 'active'
       AND linked_asset_id IS NULL
       AND last_synced_at > NOW() - INTERVAL '2 hours'
       ${filter}
     LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks SET status = 'completed', completed_at = NOW()
         WHERE task_id = $1 AND status != 'completed'`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT t.ticket_id, t.linked_remediation_id FROM "${schema}".itsm_tickets t
     WHERE t.status IN ('resolved', 'closed', 'completed')
       AND t.linked_remediation_id IS NOT NULL
       AND t.last_synced_at > NOW() - INTERVAL '2 hours'
       ${filter}
     LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".itsm_tickets SET linked_incident_id = $1 WHERE ticket_id = $2`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT incident_id FROM "${schema}".incidents
         WHERE LOWER(title) LIKE '%' || LOWER($1) || '%'
           OR LOWER($1) LIKE '%' || LOWER(title) || '%'
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT t.* FROM "${schema}".itsm_tickets t
     WHERE t.last_synced_at > NOW() - INTERVAL '2 hours'
       AND t.linked_incident_id IS NULL
       AND t.linked_remediation_id IS NULL
       ${filter}
     ORDER BY t.external_updated_at DESC NULLS LAST
     LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".iam_identities
     WHERE last_synced_at > NOW() - INTERVAL '2 hours' ${filter}`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT i.* FROM "${schema}".iam_identities i
     WHERE i.status = 'active'
       AND (i.roles @> ARRAY['admin'] OR i.roles @> ARRAY['Global Administrator'] OR i.roles @> ARRAY['super_admin'])
       AND i.last_synced_at > NOW() - INTERVAL '2 hours'
       AND i.identity_id NOT IN (
         SELECT ar.identity_id FROM "${schema}".iam_access_reviews ar
         WHERE ar.created_at > NOW() - INTERVAL '90 days' AND ar.status IN ('approved', 'revoked')
       )
       ${filter}
     LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT i.* FROM "${schema}".iam_identities i
     LEFT JOIN "${schema}".users u ON LOWER(u.email) = LOWER(i.email)
     WHERE i.status = 'active' AND u.user_id IS NULL
       AND i.last_synced_at > NOW() - INTERVAL '2 hours'
       ${filter}
     LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vuln_scan_results SET status = 'linked' WHERE result_id = $1`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vuln_scan_results
     WHERE status = 'new' ${filter}
     ORDER BY cvss_score DESC NULLS LAST LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".siem_events SET status = 'reviewed' WHERE event_id = $1`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".siem_events SET status = 'reviewed', matched_risk_ids = array_append(matched_risk_ids, $1) WHERE event_id = $2`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".siem_events SET status = 'escalated', incident_id = $1 WHERE event_id = $2`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".siem_events
     WHERE status = 'new' ${filter}
     ORDER BY event_timestamp DESC LIMIT ${BATCH_LIMIT}`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT failure_count FROM "${schema}".connector_configs WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_evidence_mappings
         (connector_type, output_type, evidence_type, control_id_pattern)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (connector_type, output_type, evidence_type) DO UPDATE
         SET control_id_pattern = COALESCE($4, connector_evidence_mappings.control_id_pattern),
             updated_at = NOW()
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT mapping_id, connector_type, output_type, evidence_type, control_id_pattern, auto_submit, enabled
     FROM "${schema}".connector_evidence_mappings ORDER BY connector_type, output_type`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_tasks SET status = 'In Progress', updated_at = NOW()
             WHERE task_id = $1 AND status IN ('pending', 'Open', 'overdue')`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence (
               title, description, status, evidence_type, source_type, source_id,
               linked_entity_type, linked_entity_id, created_by, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT et.task_id, et.control_id, et.evidence_requirement_id
         FROM "${schema}".evidence_tasks et
         WHERE et.status IN ('pending', 'Open', 'overdue')${controlFilter}
         LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT mapping_id, connector_type, output_type, evidence_type, control_id_pattern, submit_status
       FROM "${schema}".connector_evidence_mappings
       WHERE connector_type = $1 AND enabled = TRUE AND auto_submit = TRUE`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_automation_rules SET enabled = $1
     WHERE connector_code = $2 AND rule_code = $3`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_automation_rules
       (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (connector_code, rule_code) DO UPDATE SET
       rule_name_en = EXCLUDED.rule_name_en,
       trigger_event = EXCLUDED.trigger_event,
       action_type = EXCLUDED.action_type,
       conditions = EXCLUDED.conditions,
       action_config = EXCLUDED.action_config,
       enabled = EXCLUDED.enabled
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_automation_rules ${where} ORDER BY connector_code, sort_order`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_dependency_graph
       (source_connector, target_module, dependency_type, via_event, via_processor, description_en)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_dependency_graph
     WHERE source_connector = $1 AND is_active = TRUE ORDER BY target_module`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_dependency_graph WHERE is_active = TRUE
     ORDER BY source_connector, target_module`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_registry SET is_active = FALSE, updated_at = NOW()
     WHERE connector_code = $1`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_registry
       (connector_code, display_name_en, display_name_ar, connector_category, direction,
        supported_objects, data_table, produces_grc_objects, default_schedule, default_refresh_interval,
        auth_methods, platforms, icon, icon_color, setup_time, tags, documentation_url,
        is_active, licensed, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (connector_code) DO UPDATE SET
       display_name_en = EXCLUDED.display_name_en,
       display_name_ar = EXCLUDED.display_name_ar,
       connector_category = EXCLUDED.connector_category,
       direction = EXCLUDED.direction,
       supported_objects = EXCLUDED.supported_objects,
       data_table = EXCLUDED.data_table,
       produces_grc_objects = EXCLUDED.produces_grc_objects,
       default_schedule = EXCLUDED.default_schedule,
       default_refresh_interval = EXCLUDED.default_refresh_interval,
       auth_methods = EXCLUDED.auth_methods,
       platforms = EXCLUDED.platforms,
       icon = EXCLUDED.icon,
       icon_color = EXCLUDED.icon_color,
       setup_time = EXCLUDED.setup_time,
       tags = EXCLUDED.tags,
       documentation_url = EXCLUDED.documentation_url,
       is_active = EXCLUDED.is_active,
       licensed = EXCLUDED.licensed,
       sort_order = EXCLUDED.sort_order,
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_registry
     WHERE connector_category = $1 AND is_active = TRUE ORDER BY sort_order`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_registry WHERE connector_code = $1`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_registry WHERE is_active = TRUE ORDER BY sort_order`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".m365_evidence_items
               (connection_id, source_type, external_item_id, file_name, file_path, content_hash, raw_metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (connection_id, external_item_id) DO UPDATE SET
               file_name = EXCLUDED.file_name, file_path = EXCLUDED.file_path,
               content_hash = EXCLUDED.content_hash, raw_metadata = EXCLUDED.raw_metadata
             WHERE (m365_evidence_items.content_hash) IS DISTINCT FROM (EXCLUDED.content_hash)`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vuln_scan_results
               (connection_id, external_finding_id, cve_id, title, severity, cvss_score, affected_host, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (connection_id, external_finding_id) DO UPDATE SET
               cve_id = EXCLUDED.cve_id, title = EXCLUDED.title, severity = EXCLUDED.severity,
               cvss_score = EXCLUDED.cvss_score, raw_data = EXCLUDED.raw_data
             WHERE (vuln_scan_results.severity, vuln_scan_results.cvss_score)
               IS DISTINCT FROM (EXCLUDED.severity, EXCLUDED.cvss_score)`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".itsm_tickets
               (connection_id, external_ticket_id, ticket_type, summary, description, priority, status, assignee, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (connection_id, external_ticket_id) DO UPDATE SET
               status=EXCLUDED.status, priority=EXCLUDED.priority, assignee=EXCLUDED.assignee,
               raw_data=EXCLUDED.raw_data, last_synced_at=NOW(), updated_at=NOW()
             RETURNING (xmax = 0) as is_new`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".iam_identities
               (connection_id, external_user_id, email, display_name, department, job_title, status, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (connection_id, external_user_id) DO UPDATE SET
               email=EXCLUDED.email, display_name=EXCLUDED.display_name, status=EXCLUDED.status,
               raw_data=EXCLUDED.raw_data, last_synced_at=NOW(), updated_at=NOW()
             RETURNING (xmax = 0) as is_new`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".cmdb_assets
               (connection_id, external_asset_id, asset_name, asset_class, asset_type, owner, department, location, criticality, status, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (connection_id, external_asset_id) DO UPDATE SET
               asset_name=EXCLUDED.asset_name, owner=EXCLUDED.owner, status=EXCLUDED.status,
               raw_data=EXCLUDED.raw_data, last_synced_at=NOW(), updated_at=NOW()
             RETURNING (xmax = 0) as is_new`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".siem_events
               (connection_id, external_event_id, event_type, severity, parsed_data, event_timestamp)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (connection_id, external_event_id) DO UPDATE SET
               event_type = EXCLUDED.event_type, severity = EXCLUDED.severity, parsed_data = EXCLUDED.parsed_data
             WHERE (siem_events.event_type, siem_events.severity) IS DISTINCT FROM (EXCLUDED.event_type, EXCLUDED.severity)`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".${table} WHERE connection_id = $1 ORDER BY started_at DESC LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".${syncTable}
       SET status = 'failed', completed_at = NOW(), duration_ms = $1, errors = $2
       WHERE sync_id = $3`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".${syncTable} (connection_id, status) VALUES ($1, 'running') RETURNING sync_id`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".${table} SET validation_status = 'invalid', last_validated_at = NOW() WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".${table} SET validation_status = 'valid', last_validated_at = NOW() WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".${table} WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".${table} SET ${sets}, updated_at = NOW() WHERE connection_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".${table} WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".${table} ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_configs SET ${sets.join(', ')} WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT cc.*,
       ou.first_name as owner_first_name, ou.last_name as owner_last_name,
       ou.email as owner_email, ou.department_id as owner_department_id,
       t.name_en as team_name, t.team_code, t.team_lead
     FROM "${schema}".connector_configs cc
     LEFT JOIN "${schema}".users ou ON ou.user_id = cc.owner_id
     LEFT JOIN "${schema}".teams t ON t.team_id = cc.owner_team_id
     WHERE cc.connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT l.*, u.first_name, u.last_name, u.email
     FROM "${schema}".connector_status_log l
     LEFT JOIN "${schema}".users u ON u.user_id = l.changed_by
     WHERE l.connector_id = $1
     ORDER BY l.changed_at DESC`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_status_log (connector_id, from_status, to_status, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_configs SET status = $1, updated_at = NOW(), updated_by = $2 WHERE connector_id = $3`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".connector_configs WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_executions
     WHERE connector_id = $1
     ORDER BY started_at DESC
     LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_configs
       SET failure_count = failure_count + 1
       WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_executions
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE execution_id = $2`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_configs
       SET last_success_at = NOW(), failure_count = 0
       WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_executions
       SET status = 'success', completed_at = NOW(), records_collected = $1
       WHERE execution_id = $2`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_executions
           SET error_message = $1
           WHERE execution_id = $2`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_configs SET last_success_at = NOW(), failure_count = 0 WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connector_executions
           SET status = $1, completed_at = NOW(), records_collected = $2, error_message = $3
           WHERE execution_id = $4`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_executions (connector_id, status)
     VALUES ($1, 'running') RETURNING execution_id`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_configs WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT connector_id, source_system_type, status, last_success_at, failure_count, created_at
     FROM "${schema}".connector_configs
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT connector_id, source_system_type, status, last_success_at, failure_count, created_at
     FROM "${schema}".connector_configs
     WHERE connector_id = $1`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".connector_configs
       (name, source_system_type, auth_method, credentials_encrypted, endpoint_url, platform, schedule,
        retry_policy, field_mapping, control_mappings, typed_connection_id, typed_connection_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".connector_configs ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".erp_field_mappings WHERE connection_id = $1 ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".erp_connections ORDER BY name`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".erp_sync_history WHERE connection_id = $1 ORDER BY started_at DESC LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".erp_sync_history SET status='failed', errors=$1, duration_ms=$2, completed_at=NOW() WHERE sync_id=$3`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".erp_sync_history SET status='completed', records_fetched=$1, records_created=$2,
       records_updated=$3, errors=$4, duration_ms=$5, completed_at=NOW() WHERE sync_id=$6`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".erp_field_mappings WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".erp_connections WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".erp_sync_history (connection_id, status, started_at) VALUES ($1,'running',$2) RETURNING sync_id`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".erp_field_mappings (connection_id, source_field_path, target_entity, target_field, transformation_rule, mapping_config_json)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING mapping_id`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".erp_connections SET validation_status = 'invalid', updated_at = NOW()
       WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".erp_connections SET validation_status = 'valid', last_validated_at = NOW(), updated_at = NOW()
         WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".erp_connections WHERE connection_id = $1`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".erp_connections (name, erp_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".erp_connections SET name=$1, erp_type=$2, endpoint_url=$3, auth_method=$4,
       credentials_encrypted=$5, sync_schedule_cron=$6, updated_at=NOW()
       WHERE connection_id=$7 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".email_templates WHERE template_key = $1`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".email_templates WHERE active = true ORDER BY template_key`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".email_templates
     (template_key, subject, body_html, body_text, variables, active)
     VALUES ($1, $2, $3, $4, $5::jsonb, true)
     ON CONFLICT (template_key)
       DO UPDATE SET subject = $2, body_html = $3, body_text = $4,
                     variables = $5::jsonb, updated_at = now()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".data_mapping_rules
     (connector_id, source_field, target_entity, target_field, transformation, active)
     VALUES ($1::uuid, $2, $3, $4, $5, true) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".connectors
     SET status = 'pending', error_count = 0, last_error = NULL, updated_at = now()
     WHERE connector_id = $1::uuid`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `
    SELECT connector_id, connector_type, status, last_sync_at, error_count, last_error,
      CASE
        WHEN last_sync_at > now() - interval '1 hour'  THEN 'healthy'
        WHEN last_sync_at > now() - interval '24 hours' THEN 'warning'
        ELSE 'critical'
      END AS health_status
    FROM "${schema}".connectors
    ORDER BY connector_type
  `;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".webhook_logs
     (webhook_id, event_type, payload, status, response_code)
     VALUES ($1::uuid, 'test', '{"test": true}'::jsonb, 'sent', 200)`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".webhooks WHERE webhook_id = $1::uuid`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".webhooks WHERE webhook_id = $1::uuid RETURNING webhook_id`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".webhooks
     SET url = COALESCE($2, url),
         events = COALESCE($3::jsonb, events),
         active = COALESCE($4, active),
         description = COALESCE($5, description),
         updated_at = now()
     WHERE webhook_id = $1::uuid RETURNING *`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `SELECT webhook_id, url, events, active, description, last_triggered_at,
            failure_count, created_at
     FROM "${schema}".webhooks ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".webhooks (url, events, secret, active, description, created_by)
     VALUES ($1, $2::jsonb, $3, true, $4, $5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT config FROM "${schema}".integration_configs WHERE type = $1 AND enabled = true LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".integrations ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".integrations ${where}`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".integrations WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".integrations WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".integrations WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT
           COALESCE(connector_type, 'unknown') AS connector_type,
           COUNT(*)::int AS count
         FROM "${schema}".integrations
         WHERE status != 'disabled'
         GROUP BY connector_type
         ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total_syncs,
           COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           MAX(completed_at) AS last_sync_at
         FROM "${schema}".integration_sync_runs`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
         FROM "${schema}".integrations`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".integration_configs WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".integration_configs WHERE status = 'failed' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".integration_configs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'integrations' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'integrations','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".integrations WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".integrations SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT config FROM "${schema}".integration_configs
     WHERE type = 'jira' AND enabled = true
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `SELECT config FROM "${schema}".integration_configs
     WHERE type = 'slack' AND enabled = true
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `DELETE FROM public.sso_sessions WHERE expires_at < NOW()`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `DELETE FROM public.sso_sessions WHERE session_id = $1`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `SELECT * FROM public.sso_sessions WHERE session_id = $1`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".sso_sessions (session_id, tenant_id, user_id, idp_session_id, protocol, authenticated_at, expires_at, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT idp_group, platform_role FROM "${schema}".sso_role_mappings
     WHERE idp_group = ANY($1)
     ORDER BY priority ASC`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".users SET ${setClauses.join(', ')} WHERE id = $${idx}`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".users SET role = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".sso_identities (id, user_id, protocol, external_id, attributes, linked_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, protocol) DO UPDATE SET attributes = $5, linked_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `INSERT INTO public.tenant_user_memberships
         (user_id, tenant_id, role, membership_type, is_tenant_owner, status, is_primary)
       VALUES ($1, $2, $3, 'sso', FALSE, 'active', TRUE)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET status = 'active', updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".users (id, email, first_name, last_name, role, sso_provider, sso_protocol, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT id, email, role FROM "${schema}".users WHERE LOWER(email) = $1`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".sso_providers SET status = 'inactive', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".sso_providers WHERE tenant_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".sso_providers WHERE id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".sso_providers
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".sso_providers (id, tenant_id, name, protocol, status, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

}
