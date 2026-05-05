// @ts-nocheck
// Auto-extracted AiGovernance repository
import { safeQuery } from '../ports/database.port';
export class AiGovernanceAutoRepo {
    static async query1(schema, args) {
        const query = `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver
     FROM "${schema}".${tableName} WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query2(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query3(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".${tableName}
     WHERE asset_id = $1 AND is_active = TRUE`;
        return safeQuery(query, args);
    }
    static async query4(schema, args) {
        const query = `SELECT ${config.ownerColumn} AS owner FROM "${schema}".${config.tableName} WHERE ${config.idColumn} = $1`;
        return safeQuery(query, args);
    }
    static async query5(schema, args) {
        const query = `SELECT asset_id, lifecycle_status FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query6(schema, args) {
        const query = `UPDATE "${schema}".simulations SET
      changes_applied = $1, impact_projection = $2, scenario_name = $3
     WHERE simulation_id = $4
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query7(schema, args) {
        const query = `SELECT * FROM "${schema}".simulations WHERE simulation_id = $1 AND status = 'active'`;
        return safeQuery(query, args);
    }
    static async query8(schema, args) {
        const query = `UPDATE "${schema}".simulations SET
      changes_applied = $1, impact_projection = $2
     WHERE simulation_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query9(schema, args) {
        const query = `SELECT * FROM "${schema}".simulations WHERE simulation_id = $1 AND status = 'active'`;
        return safeQuery(query, args);
    }
    static async query10(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt
             FROM "${schema}".user_role_assignments
             WHERE role_name = $1 AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query11(schema, args) {
        const query = `SELECT role_name, permissions
             FROM "${schema}".functional_roles
             WHERE org_unit_id = $1 AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query12(schema, args) {
        const query = `SELECT
         ou.unit_id,
         ou.unit_name,
         ou.unit_type,
         ou.parent_unit_id,
         ou.depth,
         COALESCE(cc.control_count, 0)::int AS control_count,
         COALESCE(rc.risk_count, 0)::int AS risk_count,
         COALESCE(uc.user_count, 0)::int AS user_count
       FROM "${schema}".org_units ou
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS control_count
         FROM "${schema}".controls c
         WHERE c.org_unit_id = ou.unit_id AND c.deleted_at IS NULL
       ) cc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS risk_count
         FROM "${schema}".risks r
         WHERE r.org_unit_id::text = ou.unit_id::text AND r.deleted_at IS NULL
       ) rc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS user_count
         FROM "${schema}".user_org_assignments uoa
         WHERE uoa.org_unit_id = ou.unit_id
       ) uc ON TRUE
       WHERE ou.deleted_at IS NULL
       ORDER BY ou.depth ASC, ou.unit_name ASC`;
        return safeQuery(query, args);
    }
    static async query13(schema, args) {
        const query = `SELECT * FROM "${schema}".simulations WHERE simulation_id = $1`;
        return safeQuery(query, args);
    }
    static async query14(schema, args) {
        const query = `SELECT simulation_id, status, changes_applied, impact_projection, scenario_name, created_by, created_at
     FROM "${schema}".simulations ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query15(schema, args) {
        const query = `UPDATE "${schema}".simulations SET status = 'discarded' WHERE simulation_id = $1 RETURNING simulation_id`;
        return safeQuery(query, args);
    }
    static async query16(schema, args) {
        const query = `INSERT INTO "${schema}".simulations (source_snapshot, created_by)
     VALUES ($1, $2) RETURNING *`;
        return safeQuery(query, args);
    }
    static async query17(schema, args) {
        const query = `SELECT * FROM "${schema}".entity_links WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query18(schema, args) {
        const query = `SELECT * FROM "${schema}".organization_units ORDER BY parent_unit_id NULLS FIRST`;
        return safeQuery(query, args);
    }
    static async query19(schema, args) {
        const query = `SELECT * FROM "${schema}".simulations WHERE simulation_id = $1`;
        return safeQuery(query, args);
    }
    static async query20(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant FROM "${s}".controls`;
        return safeQuery(query, args);
    }
    static async query21(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${s}".risks WHERE status != 'closed'`;
        return safeQuery(query, args);
    }
    static async query22(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${s}".controls`;
        return safeQuery(query, args);
    }
    static async query23(schema, args) {
        const query = `SELECT COUNT(*)::int AS members FROM "${s}".team_members WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query24(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${s}".evidence_tasks`;
        return safeQuery(query, args);
    }
    static async query25(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant FROM "${s}".controls`;
        return safeQuery(query, args);
    }
    static async query26(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_model_config ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query27(schema, args) {
        const query = `DELETE FROM "${schema}".ai_model_registry WHERE model_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query28(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query29(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_model_registry ${where}`;
        return safeQuery(query, args);
    }
    static async query30(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_registry ${where} ORDER BY asset_id, version_number DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query31(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_registry
       (asset_id, version_number, provider, provider_model_id, config,
        approval_status, deployment_status, is_active, rollback_from_version_id,
        change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'approved', 'inactive', FALSE, $6, $7, $8, $9)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query32(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET deployment_status = 'retired',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE model_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query33(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET is_active = FALSE, deployment_status = 'suspended',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE model_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query34(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET is_active = TRUE, deployment_status = 'active',
         updated_by = $1, updated_at = NOW()
     WHERE model_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query35(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET is_active = FALSE, deployment_status = 'inactive',
         updated_by = $1, updated_at = NOW()
     WHERE asset_id = $2 AND is_active = TRUE
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query36(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET approval_status = 'rejected',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE model_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query37(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET approval_status = 'approved',
         approved_by = $1, approved_at = NOW(),
         updated_by = $1, updated_at = NOW()
     WHERE model_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query38(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry
     SET approval_status = 'pending_approval',
         submitted_by = $1, submitted_at = NOW(),
         updated_by = $1, updated_at = NOW()
     WHERE model_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query39(schema, args) {
        const query = `UPDATE "${schema}".ai_model_registry SET ${sets.join(', ')} WHERE model_version_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query40(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_registry
       (asset_id, version_number, provider, provider_model_id, config,
        approval_status, deployment_status, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'draft', 'inactive', $6, $7, $8)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query41(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_registry WHERE model_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query42(schema, args) {
        const query = `DELETE FROM "${schema}".ai_prompt_registry WHERE prompt_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query43(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_prompt_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query44(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_prompt_registry ${where}`;
        return safeQuery(query, args);
    }
    static async query45(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_prompt_registry ${where} ORDER BY asset_id, version_number DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query46(schema, args) {
        const query = `INSERT INTO "${schema}".ai_prompt_registry
       (asset_id, version_number, template_text, variables, linked_model_asset_id,
        approval_status, deployment_status, is_active, rollback_from_version_id,
        diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'approved', 'inactive', FALSE, $6, $7, $8, $9, $10)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query47(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET deployment_status = 'retired',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE prompt_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query48(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET is_active = FALSE, deployment_status = 'suspended',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE prompt_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query49(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET is_active = TRUE, deployment_status = 'active',
         updated_by = $1, updated_at = NOW()
     WHERE prompt_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query50(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET is_active = FALSE, deployment_status = 'inactive',
         updated_by = $1, updated_at = NOW()
     WHERE asset_id = $2 AND is_active = TRUE
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query51(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET approval_status = 'rejected',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE prompt_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query52(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET approval_status = 'approved',
         approved_by = $1, approved_at = NOW(),
         updated_by = $1, updated_at = NOW()
     WHERE prompt_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query53(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET approval_status = 'pending_approval',
         submitted_by = $1, submitted_at = NOW(),
         updated_by = $1, updated_at = NOW()
     WHERE prompt_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query54(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry SET ${sets.join(', ')} WHERE prompt_version_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query55(schema, args) {
        const query = `INSERT INTO "${schema}".ai_prompt_registry
       (asset_id, version_number, template_text, variables, linked_model_asset_id,
        approval_status, deployment_status, diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'draft', 'inactive', $6, $7, $8, $9)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query56(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_prompt_registry
     WHERE asset_id = $1 AND version_number < $2
     ORDER BY version_number DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query57(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_prompt_registry WHERE prompt_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query58(schema, args) {
        const query = `SELECT status, count(*) as total
       FROM "${schema}".quantum_migration_plans
       GROUP BY status`;
        return safeQuery(query, args);
    }
    static async query59(schema, args) {
        const query = `SELECT migration_status, count(*) as total
       FROM "${schema}".cryptographic_inventory
       GROUP BY migration_status`;
        return safeQuery(query, args);
    }
    static async query60(schema, args) {
        const query = `SELECT count(*) as total, hndl_risk_level
       FROM "${schema}".cryptographic_inventory
       WHERE is_quantum_vulnerable = TRUE
       GROUP BY hndl_risk_level`;
        return safeQuery(query, args);
    }
    static async query61(schema, args) {
        const query = `SELECT count(*) as total FROM "${schema}".cryptographic_inventory`;
        return safeQuery(query, args);
    }
    static async query62(schema, args) {
        const query = `SELECT * FROM "${schema}".pqc_test_results ${where} ORDER BY test_date DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query63(schema, args) {
        const query = `SELECT * FROM "${schema}".quantum_migration_plans WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query64(schema, args) {
        const query = `SELECT * FROM "${schema}".quantum_migration_plans ${where} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query65(schema, args) {
        const query = `SELECT * FROM "${schema}".cryptographic_inventory WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query66(schema, args) {
        const query = `SELECT * FROM "${schema}".cryptographic_inventory ${where} ORDER BY created_at DESC LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query67(schema, args) {
        const query = `INSERT INTO "${schema}".pqc_test_results
       (plan_id, asset_id, test_type, algorithm_tested, test_date,
        result, performance_impact_pct, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query68(schema, args) {
        const query = `INSERT INTO "${schema}".quantum_migration_plans
       (plan_code, name_en, name_ar, phase, target_assets, priority,
        target_algorithm, target_completion, milestones, risks,
        budget_allocated, responsible, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query69(schema, args) {
        const query = `UPDATE "${schema}".cryptographic_inventory
     SET is_quantum_vulnerable = $1, hndl_risk_level = $2, updated_at = now()
     WHERE id = $3`;
        return safeQuery(query, args);
    }
    static async query70(schema, args) {
        const query = `SELECT algorithm, data_sensitivity FROM "${schema}".cryptographic_inventory WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query71(schema, args) {
        const query = `INSERT INTO "${schema}".cryptographic_inventory
       (asset_name, asset_type, algorithm, key_length, protocol_version,
        location, system_name, owner, is_quantum_vulnerable,
        hndl_risk_level, data_sensitivity, expiry_date,
        renewal_required, migration_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query72(schema, args) {
        const query = `SELECT
      COUNT(*)::int as total_runs,
      COUNT(*) FILTER (WHERE result = 'pass')::int as passed,
      COUNT(*) FILTER (WHERE result = 'fail')::int as failed,
      COUNT(DISTINCT model_id)::int as models_tested,
      COUNT(*) FILTER (WHERE retest_scheduled_at IS NOT NULL AND retest_scheduled_at > NOW())::int as pending_retests
     FROM "${schema}".red_team_runs`;
        return safeQuery(query, args);
    }
    static async query73(schema, args) {
        const query = sql;
        return safeQuery(query, args);
    }
    static async query74(schema, args) {
        const query = `INSERT INTO "${schema}".red_team_runs
      (model_id, canary_prompt, result, vulnerability_type, severity, incident_id, retest_scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query75(schema, args) {
        const query = `INSERT INTO "${schema}".incidents
        (title, description, category, severity, status, reported_by)
       VALUES ($1, $2, 'red_team_finding', $3, 'reported', 'red_team_autopilot')
       RETURNING incident_id`;
        return safeQuery(query, args);
    }
    static async query76(schema, args) {
        const query = `CREATE INDEX IF NOT EXISTS idx_aiia_model ON "${schema}".ai_impact_assessments(model_id)`;
        return safeQuery(query, args);
    }
    static async query77(schema, args) {
        const query = `CREATE INDEX IF NOT EXISTS idx_aiia_tenant ON "${schema}".ai_impact_assessments(tenant_id)`;
        return safeQuery(query, args);
    }
    static async query78(schema, args) {
        const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".ai_impact_assessments (
      assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      model_id UUID NOT NULL,
      created_by UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      risk_level VARCHAR(20),
      overall_risk_score NUMERIC(5,2),
      sections_json JSONB DEFAULT '[]',
      recommendations_json JSONB DEFAULT '[]',
      classification_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
        return safeQuery(query, args);
    }
    static async query79(schema, args) {
        const query = `SELECT assessment_id, status, overall_risk_score, sections_json
     FROM "${schema}".ai_impact_assessments
     WHERE model_id = $1
     ORDER BY created_at DESC
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query80(schema, args) {
        const query = `UPDATE "${schema}".ai_impact_assessments
     SET overall_risk_score = $1,
         risk_level = $2,
         recommendations_json = $3,
         updated_at = NOW()
     WHERE assessment_id = $4`;
        return safeQuery(query, args);
    }
    static async query81(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_impact_assessments WHERE assessment_id = $1`;
        return safeQuery(query, args);
    }
    static async query82(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_impact_assessments WHERE assessment_id = $1`;
        return safeQuery(query, args);
    }
    static async query83(schema, args) {
        const query = `INSERT INTO "${schema}".ai_impact_assessments
       (assessment_id, tenant_id, model_id, created_by, status,
        sections_json, recommendations_json, classification_json,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'draft', $5, '[]'::jsonb, $6, NOW(), NOW())`;
        return safeQuery(query, args);
    }
    static async query84(schema, args) {
        const query = `SELECT asset_id FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query85(schema, args) {
        const query = `SELECT asset_id, asset_key, display_name, description, metadata, tags
     FROM "${schema}".ai_asset_inventory
     WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query86(schema, args) {
        const query = `SELECT 1 FROM "${schema}".tenant_ai_allowlist
     WHERE tenant_id = $1 AND asset_id = $2 AND is_enabled = TRUE
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query87(schema, args) {
        const query = `SELECT * FROM "${schema}".tenant_ai_allowlist
     WHERE ${wheres.join(' AND ')}
     ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query88(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_tool_bindings
     WHERE tenant_id = $1 AND agent_asset_id = $2 AND is_enabled = TRUE
     ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query89(schema, args) {
        const query = `SELECT tool_asset_id FROM "${schema}".ai_agent_tool_bindings
     WHERE tenant_id = $1 AND agent_asset_id = $2 AND is_enabled = TRUE
     ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query90(schema, args) {
        const query = `UPDATE "${schema}".tenant_ai_allowlist
         SET asset_id = $1, asset_type = $2, updated_by = $3, updated_at = NOW()
         WHERE allowlist_id = $4 AND tenant_id = $5`;
        return safeQuery(query, args);
    }
    static async query91(schema, args) {
        const query = `SELECT asset_id, asset_type FROM "${schema}".ai_asset_inventory
         WHERE asset_key = $1 AND asset_type = 'model' AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query92(schema, args) {
        const query = `SELECT asset_id, asset_type FROM "${schema}".ai_asset_inventory
         WHERE asset_key = $1 AND asset_type = 'provider' AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query93(schema, args) {
        const query = `SELECT * FROM "${schema}".tenant_ai_allowlist WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query94(schema, args) {
        const query = `INSERT INTO "${schema}".tenant_ai_allowlist
       (tenant_id, asset_id, asset_type, provider, model_id, is_enabled,
        max_tokens_limit, temperature_limit, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT ON CONSTRAINT uq_tenant_allowlist_asset DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       notes = EXCLUDED.notes,
       max_tokens_limit = EXCLUDED.max_tokens_limit,
       temperature_limit = EXCLUDED.temperature_limit,
       updated_by = EXCLUDED.created_by,
       updated_at = NOW()
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query95(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".tenant_ai_allowlist WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query96(schema, args) {
        const query = `SELECT * FROM "${schema}".tenant_ai_allowlist
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query97(schema, args) {
        const query = `DELETE FROM "${schema}".tenant_ai_allowlist
     WHERE allowlist_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query98(schema, args) {
        const query = `UPDATE "${schema}".tenant_ai_allowlist
     SET ${sets.join(', ')}
     WHERE allowlist_id = $${idx} AND tenant_id = $${idx + 1}
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query99(schema, args) {
        const query = `SELECT * FROM "${schema}".tenant_ai_allowlist
     WHERE allowlist_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query100(schema, args) {
        const query = `INSERT INTO "${schema}".tenant_ai_allowlist
       (tenant_id, asset_id, asset_type, provider, model_id, is_enabled,
        max_tokens_limit, temperature_limit, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query101(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_tool_bindings
       (tenant_id, agent_asset_id, tool_asset_id, is_enabled, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ON CONSTRAINT uq_agent_tool_binding_tenant DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       notes = EXCLUDED.notes,
       updated_by = EXCLUDED.created_by,
       updated_at = NOW()
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query102(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_agent_tool_bindings WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query103(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_tool_bindings
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query104(schema, args) {
        const query = `DELETE FROM "${schema}".ai_agent_tool_bindings
     WHERE binding_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query105(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_tool_bindings
     SET ${sets.join(', ')}
     WHERE binding_id = $${idx} AND tenant_id = $${idx + 1}
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query106(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_tool_bindings
     WHERE binding_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query107(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_tool_bindings
       (tenant_id, agent_asset_id, tool_asset_id, is_enabled, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query108(schema, args) {
        const query = `SELECT eura.user_id, eura.functional_role_code AS role_code, eura.authority_level
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN public.users u ON u.user_id = eura.user_id AND u.status = 'active'
     WHERE eura.module_code = $1
       AND eura.user_id != $2
       AND eura.is_active = TRUE
       AND (eura.valid_to IS NULL OR eura.valid_to > NOW())
       AND eura.authority_level IN ('approve_low', 'approve_medium', 'approve_high', 'override')
     ORDER BY
       CASE eura.authority_level
         WHEN 'override' THEN 6
         WHEN 'approve_high' THEN 5
         WHEN 'approve_medium' THEN 4
         WHEN 'approve_low' THEN 3
         ELSE 0
       END DESC
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query109(schema, args) {
        const query = `SELECT DISTINCT eura.user_id
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN public.users u ON u.user_id = eura.user_id AND u.status = 'active'
     WHERE eura.functional_role_code = ANY($1)
       AND eura.module_code = $2
       AND eura.is_active = TRUE
       AND (eura.valid_to IS NULL OR eura.valid_to > NOW())
     ORDER BY eura.user_id`;
        return safeQuery(query, args);
    }
    static async query110(schema, args) {
        const query = `SELECT action_class, autonomy_level
     FROM "${schema}".ai_action_policies
     WHERE archetype_code = $1 AND module_code = $2`;
        return safeQuery(query, args);
    }
    static async query111(schema, args) {
        const query = `SELECT autonomy_level, requires_approval, approval_role,
            max_risk_level, cooldown_minutes
     FROM "${schema}".ai_action_policies
     WHERE archetype_code = $1 AND module_code = $2 AND action_class = $3`;
        return safeQuery(query, args);
    }
    static async query112(schema, args) {
        const query = `SELECT ap.profile_code FROM "${schema}".actor_access_assignments aaa
       JOIN "${schema}".access_profiles ap ON ap.profile_id = aaa.profile_id AND ap.is_active = true
       WHERE aaa.user_id = $1 AND aaa.is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query113(schema, args) {
        const query = `SELECT DISTINCT rp.permission_code FROM "${schema}".actor_role_assignments ara
       JOIN "${schema}".role_permissions rp ON rp.role_code = ara.role_code AND rp.is_active = true
       WHERE ara.user_id = $1 AND ara.is_active = true`;
        return safeQuery(query, args);
    }
    static async query114(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_session_governance
     SET status = 'escalated', escalations = escalations + 1, human_interventions = human_interventions + 1
     WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query115(schema, args) {
        const query = `SELECT c.*, ps.agent_id as parent_agent, cs.agent_id as child_agent
     FROM "${schema}".ai_agent_chain_of_custody c
     LEFT JOIN "${schema}".ai_agent_session_governance ps ON c.parent_session_id = ps.id
     LEFT JOIN "${schema}".ai_agent_session_governance cs ON c.child_session_id = cs.id
     WHERE c.parent_session_id = $1 OR c.child_session_id = $1
     ORDER BY c.created_at DESC`;
        return safeQuery(query, args);
    }
    static async query116(schema, args) {
        const query = `SELECT s.*, sc.module_code, sc.scope_type, sc.max_actions_per_session, sc.max_cost_per_session
     FROM "${schema}".ai_agent_session_governance s
     LEFT JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.id = $1`;
        return safeQuery(query, args);
    }
    static async query117(schema, args) {
        const query = `SELECT s.*, sc.module_code, sc.scope_type
     FROM "${schema}".ai_agent_session_governance s
     LEFT JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     ${where}
     ORDER BY s.created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query118(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_authority_scopes WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query119(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_authority_scopes ${where} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query120(schema, args) {
        const query = `SELECT s.*, sc.module_code, sc.scope_type, sc.max_actions_per_session
     FROM "${schema}".ai_agent_session_governance s
     JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.agent_id = $1
     ORDER BY s.created_at DESC
     LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query121(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_chain_of_custody
       (parent_session_id, child_session_id, delegation_depth,
        delegated_scope, delegation_reason, approval_method, risk_at_delegation)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`;
        return safeQuery(query, args);
    }
    static async query122(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_session_governance
       (scope_id, agent_id, session_isolation, status)
     SELECT scope_id, $1, $2, 'active'
     FROM "${schema}".ai_agent_session_governance WHERE id = $3
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query123(schema, args) {
        const query = `SELECT sc.max_sub_agent_depth
     FROM "${schema}".ai_agent_session_governance s
     JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.id = $1`;
        return safeQuery(query, args);
    }
    static async query124(schema, args) {
        const query = `WITH RECURSIVE chain AS (
       SELECT id, 0 as depth FROM "${schema}".ai_agent_session_governance WHERE id = $1
       UNION ALL
       SELECT c.child_session_id, chain.depth + 1
       FROM "${schema}".ai_agent_chain_of_custody c
       JOIN chain ON c.parent_session_id = chain.id
     )
     SELECT max(depth) as max_depth FROM chain`;
        return safeQuery(query, args);
    }
    static async query125(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_session_governance
       SET pii_exposure_detected = TRUE, output_validation_failures = output_validation_failures + 1
       WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query126(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_session_governance
       SET prompt_injection_detected = TRUE
       WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query127(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_session_governance
     SET status = $1, session_end = now()
     WHERE id = $2`;
        return safeQuery(query, args);
    }
    static async query128(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_session_governance SET status = 'budget_exceeded' WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query129(schema, args) {
        const query = `SELECT s.actions_taken, s.cost_incurred, s.status,
            sc.max_actions_per_session, sc.max_cost_per_session
     FROM "${schema}".ai_agent_session_governance s
     JOIN "${schema}".ai_agent_authority_scopes sc ON s.scope_id = sc.id
     WHERE s.id = $1`;
        return safeQuery(query, args);
    }
    static async query130(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_session_governance
     SET actions_taken = actions_taken + 1,
         cost_incurred = cost_incurred + $1,
         tokens_used = tokens_used + $2,
         tool_calls = tool_calls + $3,
         reasoning_trace = reasoning_trace || $4::jsonb
     WHERE id = $5`;
        return safeQuery(query, args);
    }
    static async query131(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_session_governance
       (scope_id, agent_id, status)
     VALUES ($1, $2, 'active')
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query132(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_authority_scopes
       (agent_id, system_id, module_code, scope_type,
        max_actions_per_session, max_cost_per_session, max_sub_agent_depth,
        requires_human_approval, confidence_threshold,
        transparency_notice, allowed_tools, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query133(schema, args) {
        const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".ai_systems ${where} GROUP BY status`;
        return safeQuery(query, args);
    }
    static async query134(schema, args) {
        const query = `SELECT COUNT(*) as total FROM "${schema}".ai_systems ${where}`;
        return safeQuery(query, args);
    }
    static async query135(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_systems WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query136(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_systems WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query137(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_systems WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query138(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_experiments ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query139(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_experiments
       WHERE system_id = $1 ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query140(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_experiments WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query141(schema, args) {
        const query = `UPDATE "${schema}".ai_model_experiments
     SET winner = $1, statistical_significance = $2,
         declared_by = $3, declared_at = now(),
         status = 'completed', updated_at = now()
     WHERE id = $4`;
        return safeQuery(query, args);
    }
    static async query142(schema, args) {
        const query = `UPDATE "${schema}".ai_model_experiments
     SET ${resultCol} = $1, ${sampleCol} = ${sampleCol} + $2, updated_at = now()
     WHERE id = $3`;
        return safeQuery(query, args);
    }
    static async query143(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_experiments
       (system_id, experiment_name, hypothesis,
        variant_a_config, variant_b_config, traffic_split_pct,
        start_date, end_date, primary_metric, success_threshold, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query144(schema, args) {
        const query = `UPDATE "${schema}".ai_user_complaints
       SET escalated_to_incident = TRUE, status = 'escalated'
       WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query145(schema, args) {
        const query = `INSERT INTO "${schema}".ai_user_complaints
       (system_id, complainant_type, complaint_category, description, status)
     VALUES ($1,$2,$3,$4,'open')
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query146(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_user_complaints ${where} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query147(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_serious_incidents WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query148(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_serious_incidents ${where} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query149(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_performance_metrics ${where} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query150(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_monitoring_plans WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query151(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_monitoring_plans ${where} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query152(schema, args) {
        const query = `SELECT count(*) as cnt, status
       FROM "${schema}".ai_user_complaints
       WHERE system_id = $1 AND created_at >= now() - interval '${interval}'
       GROUP BY status`;
        return safeQuery(query, args);
    }
    static async query153(schema, args) {
        const query = `SELECT count(*) as cnt, severity
       FROM "${schema}".ai_serious_incidents
       WHERE system_id = $1 AND created_at >= now() - interval '${interval}'
       GROUP BY severity`;
        return safeQuery(query, args);
    }
    static async query154(schema, args) {
        const query = `SELECT metric_name, avg(metric_value) as avg_val, count(*) as cnt,
              sum(CASE WHEN is_breach THEN 1 ELSE 0 END) as breaches
       FROM "${schema}".ai_performance_metrics
       WHERE system_id = $1 AND created_at >= now() - interval '${interval}'
       GROUP BY metric_name`;
        return safeQuery(query, args);
    }
    static async query155(schema, args) {
        const query = `SELECT name_en, name_ar FROM "${schema}".ai_system_registry WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query156(schema, args) {
        const query = `INSERT INTO "${schema}".ai_serious_incidents
       (system_id, incident_type, severity, description,
        affected_persons_count, harm_type, harm_description,
        root_cause, immediate_actions,
        authority_report_required, authority_name,
        report_deadline, corrective_action_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
             now() + ${deadlineInterval}, $12)
     RETURNING id, report_deadline`;
        return safeQuery(query, args);
    }
    static async query157(schema, args) {
        const query = `SELECT count(*) as cnt FROM "${schema}".ai_performance_metrics WHERE system_id = $1`;
        return safeQuery(query, args);
    }
    static async query158(schema, args) {
        const query = `SELECT m.*, p.threshold_config
     FROM "${schema}".ai_performance_metrics m
     LEFT JOIN "${schema}".ai_monitoring_plans p ON m.plan_id = p.id
     WHERE m.system_id = $1 AND m.is_breach = TRUE
     ORDER BY m.created_at DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query159(schema, args) {
        const query = `INSERT INTO "${schema}".ai_performance_metrics
       (system_id, plan_id, metric_name, metric_value, threshold_value,
        is_breach, measurement_period_start, measurement_period_end,
        data_points, confidence_interval, trend)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query160(schema, args) {
        const query = `INSERT INTO "${schema}".ai_monitoring_plans
       (system_id, plan_type, monitoring_frequency, metrics_tracked,
        threshold_config, alert_recipients, review_schedule, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query161(schema, args) {
        const query = `SELECT user_id FROM "${schema}".user_roles WHERE role_code = $1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query162(schema, args) {
        const query = `UPDATE "${schema}".ai_governance_actions
     SET approval_chain = $1, requires_ethics = $2, requires_privacy = $3,
         requires_board = $4, dpia_required = $5, updated_at = NOW()
     WHERE action_id = $6`;
        return safeQuery(query, args);
    }
    static async query163(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_governance_actions WHERE action_id = $1`;
        return safeQuery(query, args);
    }
    static async query164(schema, args) {
        const query = `SELECT DISTINCT ai.asset_key
     FROM "${schema}".${table} r
     JOIN "${schema}".ai_asset_inventory ai ON ai.asset_id = r.asset_id
     WHERE ai.asset_type = $1 AND ai.asset_key = ANY($2)
       AND r.is_active = TRUE AND ai.deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query165(schema, args) {
        const query = `SELECT asset_key FROM "${schema}".ai_asset_inventory
     WHERE asset_type = $1 AND asset_key = ANY($2) AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query166(schema, args) {
        const query = `SELECT config_key FROM "${schema}".platform_operation_config WHERE config_key = ANY($1) AND owner_module IN ('ai_governance', 'platform')`;
        return safeQuery(query, args);
    }
    static async query167(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE asset_id IS NULL)::int AS without_asset_id
     FROM "${schema}".tenant_ai_allowlist WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query168(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".tenant_ai_allowlist WHERE tenant_id = $1 AND is_enabled = TRUE`;
        return safeQuery(query, args);
    }
    static async query169(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_agent_tool_bindings WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query170(schema, args) {
        const query = `INSERT INTO "${schema}".platform_operation_config (config_key, config_value, description_en, owner_module, owner_type, updated_at)
       VALUES ($1, $2, $3, 'ai_governance', 'module', NOW())
       ON CONFLICT (config_key, owner_module) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query171(schema, args) {
        const query = `INSERT INTO "${schema}".tenant_ai_allowlist
           (tenant_id, asset_id, asset_type, provider, model_id, is_enabled, notes, created_by)
         VALUES ($1, $2, 'model', $3, $4, TRUE, 'Seeded default allowlist entry', 'system')
         ON CONFLICT (tenant_id, provider, model_id) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query172(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_tool_bindings
           (agent_asset_id, tool_asset_id, tenant_id, is_enabled, notes, created_by)
         VALUES ($1, $2, $3, TRUE, 'Seeded default binding', 'system')
         ON CONFLICT (tenant_id, agent_asset_id, tool_asset_id) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query173(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_registry
         (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
          capabilities, approval_status, deployment_status, is_active, change_summary, created_by)
       VALUES ($1, 1, $2, $3, $4, $5, 'approved', 'active', TRUE, 'Seeded default version', 'system')
       ON CONFLICT (asset_id, version_number) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query174(schema, args) {
        const query = `INSERT INTO "${schema}".ai_prompt_registry
         (asset_id, version_number, template_text, variables, linked_model_asset_id,
          approval_status, deployment_status, is_active, change_summary, created_by)
       VALUES ($1, 1, $2, '[]', $3, 'approved', 'active', TRUE, 'Seeded default version', 'system')
       ON CONFLICT (asset_id, version_number) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query175(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_registry
         (asset_id, version_number, provider, provider_model_id, config,
          approval_status, deployment_status, is_active, change_summary, created_by)
       VALUES ($1, 1, $2, $3, $4, 'approved', 'active', TRUE, 'Seeded default version', 'system')
       ON CONFLICT (asset_id, version_number) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query176(schema, args) {
        const query = `SELECT 1 FROM "${schema}".${table} WHERE asset_id = $1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query177(schema, args) {
        const query = `SELECT asset_id FROM "${schema}".ai_asset_inventory
     WHERE asset_type = $1 AND asset_key = $2 AND deleted_at IS NULL LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query178(schema, args) {
        const query = `INSERT INTO "${schema}".platform_operation_config (config_key, config_value, description_en, owner_module, owner_type, updated_at)
     VALUES ($1, $2, $3, 'ai_governance', 'module', NOW())
     ON CONFLICT (config_key, owner_module) DO UPDATE SET config_value = $2, updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query179(schema, args) {
        const query = `SELECT config_value FROM "${schema}".platform_operation_config WHERE config_key = $1 AND owner_module = 'ai_governance' LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query180(schema, args) {
        const query = `SELECT entity_type, entity_id, action, user_id AS performed_by, created_at AS performed_at
     FROM "${schema}".audit_trail
     WHERE module = 'ai_governance' AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query181(schema, args) {
        const query = `SELECT ad.dpia_id, ad.system_id, asr.code AS system_code, asr.name_en AS system_name,
         asr.risk_level, ad.status, ad.risk_score,
         (SELECT COUNT(*)::int FROM "${schema}".ai_dpia_mitigations adm
          WHERE adm.dpia_id = ad.dpia_id AND adm.deleted_at IS NULL) AS mitigation_count,
         (SELECT COUNT(*)::int FROM "${schema}".ai_dpia_mitigations adm
          WHERE adm.dpia_id = ad.dpia_id AND adm.status = 'open' AND adm.deleted_at IS NULL) AS open_mitigations,
         ad.conducted_by, ad.completed_at, ad.expires_at
       FROM "${schema}".ai_dpias ad
       JOIN "${schema}".ai_system_registry asr ON asr.system_id = ad.system_id
       WHERE ad.deleted_at IS NULL
       ORDER BY CASE ad.status WHEN 'in_progress' THEN 0 WHEN 'under_review' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
                ad.created_at DESC
       LIMIT 30`;
        return safeQuery(query, args);
    }
    static async query182(schema, args) {
        const query = `SELECT risk_level, COUNT(*)::int AS count
         FROM "${schema}".ai_system_registry
         WHERE deleted_at IS NULL
         GROUP BY risk_level
         ORDER BY CASE risk_level WHEN 'unacceptable' THEN 0 WHEN 'high' THEN 1 WHEN 'limited' THEN 2 WHEN 'minimal' THEN 3 ELSE 4 END`;
        return safeQuery(query, args);
    }
    static async query183(schema, args) {
        const query = `SELECT COUNT(*)::int AS overdue
         FROM "${schema}".ai_system_registry
         WHERE status IN ('registered', 'deployed', 'approved')
           AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '90 days')
           AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query184(schema, args) {
        const query = `SELECT COUNT(*)::int AS high_risk
         FROM "${schema}".ai_supply_chain
         WHERE risk_level = 'high' AND status = 'active' AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query185(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress', 'under_review'))::int AS pending,
           COUNT(*) FILTER (WHERE status = 'expired' OR (expires_at IS NOT NULL AND expires_at < NOW()))::int AS expired
         FROM "${schema}".ai_dpias WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query186(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM "${schema}".ai_governance_policies WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query187(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated
         FROM "${schema}".ai_model_cards WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query188(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'deployed')::int AS deployed,
           COUNT(*) FILTER (WHERE risk_level IN ('high', 'unacceptable'))::int AS high_risk,
           COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
         FROM "${schema}".ai_system_registry WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query189(schema, args) {
        const query = `SELECT entry_id, timestamp, user_id, module, action, entity_type, entity_id,
            before_state, after_state
     FROM "${schema}".audit_trail ${whereClause}
     ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
        return safeQuery(query, args);
    }
    static async query190(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail ${whereClause}`;
        return safeQuery(query, args);
    }
    static async query191(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module = 'ai-governance-ops' AND action = 'break_glass'
       AND timestamp >= ${thirtyDaysAgo}`;
        return safeQuery(query, args);
    }
    static async query192(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'update'
       AND after_state->>'rollback_from_version_id' IS NOT NULL
       AND timestamp >= ${thirtyDaysAgo}`;
        return safeQuery(query, args);
    }
    static async query193(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_governance_break_glass`;
        return safeQuery(query, args);
    }
    static async query194(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_governance_break_glass WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`;
        return safeQuery(query, args);
    }
    static async query195(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'sod_check'
       AND before_state->>'conflict' = 'true'
       AND timestamp >= ${thirtyDaysAgo}`;
        return safeQuery(query, args);
    }
    static async query196(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'update'
       AND after_state->>'approval_status' = 'rejected'
       AND timestamp >= ${thirtyDaysAgo}`;
        return safeQuery(query, args);
    }
    static async query197(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'update'
       AND after_state->>'approval_status' = 'approved'
       AND timestamp >= ${thirtyDaysAgo}`;
        return safeQuery(query, args);
    }
    static async query198(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_agent_registry WHERE approval_status = 'pending_approval'`;
        return safeQuery(query, args);
    }
    static async query199(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_prompt_registry WHERE approval_status = 'pending_approval'`;
        return safeQuery(query, args);
    }
    static async query200(schema, args) {
        const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_model_registry WHERE approval_status = 'pending_approval'`;
        return safeQuery(query, args);
    }
    static async query201(schema, args) {
        const query = `UPDATE "${schema}".ai_governance_break_glass
     SET status = 'expired'
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()
     RETURNING break_glass_id, asset_id, registry_type`;
        return safeQuery(query, args);
    }
    static async query202(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_governance_promotions ${whereClause}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        return safeQuery(query, args);
    }
    static async query203(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_governance_promotions ${whereClause}`;
        return safeQuery(query, args);
    }
    static async query204(schema, args) {
        const query = `INSERT INTO "${schema}".ai_governance_promotions
       (asset_id, version_id, registry_type, from_environment, to_environment, promoted_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query205(schema, args) {
        const query = `${effectiveCte} SELECT *, effective_status AS status FROM bg ${effectiveWhere}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        return safeQuery(query, args);
    }
    static async query206(schema, args) {
        const query = `${effectiveCte} SELECT COUNT(*)::int AS total FROM bg ${effectiveWhere}`;
        return safeQuery(query, args);
    }
    static async query207(schema, args) {
        const query = `UPDATE "${schema}".ai_governance_break_glass
     SET status = 'revoked', revoked_by = $2, revoked_at = NOW()
     WHERE break_glass_id = $1 AND status = 'active'
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query208(schema, args) {
        const query = `INSERT INTO "${schema}".ai_governance_break_glass
       (asset_id, version_id, registry_type, actor_id, reason, status, duration_minutes, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, ${expiresAt})
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query209(schema, args) {
        const query = `SELECT module_code, agent_id, allowed_fields, blocked_fields, max_records, max_field_length
     FROM "${schema}".ai_data_minimization_config WHERE enabled = true`;
        return safeQuery(query, args);
    }
    static async query210(schema, args) {
        const query = `SELECT * FROM "${schema}".human_oversight_config
     WHERE system_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query211(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query212(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query213(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query214(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query215(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_profiling_register WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query216(schema, args) {
        const query = `SELECT * FROM "${schema}".automated_decision_register WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query217(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_privacy_incidents WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query218(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_privacy_impact_register WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query219(schema, args) {
        const query = `SELECT system_id, oversight_level, intervention_triggers, review_frequency_days, updated_at
     FROM "${schema}".human_oversight_config
     WHERE 1=1${systemFilter}
     ORDER BY updated_at DESC`;
        return safeQuery(query, args);
    }
    static async query220(schema, args) {
        const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE opt_out_mechanism IS NOT NULL AND opt_out_mechanism != '')::int AS with_opt_out
     FROM "${schema}".automated_decision_register
     WHERE 1=1${systemFilter}`;
        return safeQuery(query, args);
    }
    static async query221(schema, args) {
        const query = `SELECT
       COALESCE(SUM(epsilon_budget), 0)::float AS total_budget,
       COALESCE(SUM(epsilon_consumed), 0)::float AS total_consumed
     FROM "${schema}".ai_privacy_impact_register
     WHERE 1=1${systemFilter}`;
        return safeQuery(query, args);
    }
    static async query222(schema, args) {
        const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
     FROM "${schema}".ai_privacy_incidents
     WHERE 1=1${systemFilter}`;
        return safeQuery(query, args);
    }
    static async query223(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_training_data_registry
     WHERE system_id = $1 ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query224(schema, args) {
        const query = `INSERT INTO "${schema}".ai_training_data_registry
       (system_id, dataset_name, data_source, contains_personal_data,
        personal_data_categories, consent_obtained, consent_type,
        anonymization_applied, anonymization_method,
        representativeness_assessment, bias_evaluation,
        data_quality_score, sample_size,
        collection_start, collection_end, retention_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query225(schema, args) {
        const query = `INSERT INTO "${schema}".human_oversight_config
       (system_id, oversight_level, oversight_description,
        intervention_triggers, escalation_threshold, override_authority,
        stop_mechanism, training_required, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query226(schema, args) {
        const query = `INSERT INTO "${schema}".ai_profiling_register
       (system_id, profiling_purpose, categories_profiled, data_sources,
        inference_types, retention_period_days, legal_basis,
        safeguards, impact_on_individuals, objection_mechanism,
        transparency_measures, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query227(schema, args) {
        const query = `INSERT INTO "${schema}".automated_decision_register
       (system_id, decision_type, module_code, logic_explanation_en,
        logic_explanation_ar, significance, profiling_involved,
        profiling_categories, opt_out_mechanism, human_review_available,
        human_reviewer_role, data_used, accuracy_rate, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query228(schema, args) {
        const query = `INSERT INTO "${schema}".ai_privacy_incidents
       (system_id, incident_type, severity, affected_data_subjects,
        data_categories_affected, detection_method, detected_at,
        containment_measures, remediation_steps,
        authority_notification_required, notification_deadline,
        data_subject_notification_required,
        root_cause, preventive_measures, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query229(schema, args) {
        const query = `INSERT INTO "${schema}".ai_privacy_impact_register
       (system_id, privacy_risk_level, data_types_processed,
        processing_purpose, legal_basis, consent_mechanism,
        epsilon_budget, epsilon_consumed, dpia_required, dpia_completed,
        dpia_reference, anonymization_techniques, data_minimization_measures,
        storage_limitation, cross_border_processing, adequacy_decision)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query230(schema, args) {
        const query = `INSERT INTO "${schema}".ai_asset_inventory
       (asset_type, asset_key, display_name, description,
        scope_type, tenant_id,
        lifecycle_status, status,
        business_owner, technical_owner, governance_owner,
        source_type, source_ref,
        metadata, tags,
        created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (scope_type, asset_type, asset_key, tenant_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       description = EXCLUDED.description,
       source_ref = EXCLUDED.source_ref,
       metadata = EXCLUDED.metadata,
       tags = EXCLUDED.tags,
       updated_at = NOW()
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query231(schema, args) {
        const query = `DELETE FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query232(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_asset_inventory WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query233(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_asset_inventory WHERE ${where} ORDER BY asset_type, asset_key LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query234(schema, args) {
        const query = `UPDATE "${schema}".ai_asset_inventory SET ${sets.join(', ')} WHERE asset_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query235(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_asset_inventory
     WHERE asset_type = $1 AND asset_key = $2 AND scope_type = $3 AND tenant_id = $4
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query236(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`;
        return safeQuery(query, args);
    }
    static async query237(schema, args) {
        const query = `INSERT INTO "${schema}".ai_asset_inventory
       (asset_type, asset_key, display_name, description,
        scope_type, tenant_id,
        lifecycle_status, status,
        business_owner, technical_owner, governance_owner,
        source_type, source_ref,
        metadata, tags,
        created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query238(schema, args) {
        const query = `SELECT agent_id, card_json->>'model_name' AS model_name, card_json->>'version' AS version,
            card_json->>'purpose_en' AS purpose, generated_at
     FROM "${schema}".ai_model_cards WHERE tenant_id = $1 ORDER BY generated_at DESC`;
        return safeQuery(query, args);
    }
    static async query239(schema, args) {
        const query = `SELECT card_json FROM "${schema}".ai_model_cards WHERE tenant_id = $1 AND agent_id = $2`;
        return safeQuery(query, args);
    }
    static async query240(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_cards (tenant_id, agent_id, card_json, generated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tenant_id, agent_id) DO UPDATE SET card_json = $3, generated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query241(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_registry WHERE system_id = $1 OR system_name ILIKE '%' || $1 || '%' LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query242(schema, args) {
        const query = `SELECT protected_attribute, bias_metric, metric_value, threshold, violation_detected
              FROM "${schema}".ai_agent_bias_detection WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query243(schema, args) {
        const query = `SELECT metric_type, AVG(metric_value) AS avg_val, COUNT(*) AS sample_count
              FROM "${schema}".ai_agent_performance_metrics WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '30 days'
              GROUP BY metric_type`;
        return safeQuery(query, args);
    }
    static async query244(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_runtime_config WHERE agent_id = $1`;
        return safeQuery(query, args);
    }
    static async query245(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_registry ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query246(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_registry WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query247(schema, args) {
        const query = `INSERT INTO "${schema}".ai_system_logs
       (system_id, event_type, event_data, severity)
     VALUES ($1, 'stakeholder_notification', $2, 'info')`;
        return safeQuery(query, args);
    }
    static async query248(schema, args) {
        const query = `UPDATE "${schema}".ai_stakeholder_registry SET last_contacted_at = NOW() WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query249(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_stakeholder_registry
     WHERE system_id = $1`;
        return safeQuery(query, args);
    }
    static async query250(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_logs
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT 500`;
        return safeQuery(query, args);
    }
    static async query251(schema, args) {
        const query = `INSERT INTO "${schema}".ai_system_logs
       (system_id, event_type, event_data, severity)
     VALUES ($1, 'serious_incident', $2, $3)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query252(schema, args) {
        const query = `UPDATE "${schema}".ai_technical_documentation
         SET content = $1, updated_at = NOW()
         WHERE id = $2`;
        return safeQuery(query, args);
    }
    static async query253(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_technical_documentation
     WHERE system_id = $1 ORDER BY section_number`;
        return safeQuery(query, args);
    }
    static async query254(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_registry WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query255(schema, args) {
        const query = `INSERT INTO "${schema}".ai_system_logs (system_id, event_type, event_data, severity)
     VALUES ($1, 'reassessment_triggered', $2, 'warning')`;
        return safeQuery(query, args);
    }
    static async query256(schema, args) {
        const query = `UPDATE "${schema}".ai_conformity_assessments SET reassessment_trigger = $1 WHERE id = $2`;
        return safeQuery(query, args);
    }
    static async query257(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_impact_assessments
     WHERE system_id = $1 ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query258(schema, args) {
        const query = `SELECT r.id, r.system_code, r.name_en, r.risk_classification,
            r.deployment_status, r.next_assessment_due,
            r.last_conformity_assessment_at,
            (SELECT COUNT(*)::int FROM "${schema}".ai_conformity_assessments a
             WHERE a.system_id = r.id AND a.status = 'completed' AND a.conformity_result = 'conformant') AS conformant_count,
            (SELECT COUNT(*)::int FROM "${schema}".ai_conformity_assessments a
             WHERE a.system_id = r.id AND a.corrective_action_status IN ('open', 'in_progress')) AS open_actions,
            (SELECT COUNT(*)::int FROM "${schema}".ai_corrective_actions ca
             WHERE ca.system_id = r.id AND ca.status IN ('open', 'in_progress')) AS corrective_actions_open
     FROM "${schema}".ai_system_registry r
     ORDER BY
       CASE r.risk_classification WHEN 'high' THEN 1 WHEN 'limited' THEN 2 ELSE 3 END,
       r.next_assessment_due ASC NULLS LAST`;
        return safeQuery(query, args);
    }
    static async query259(schema, args) {
        const query = `UPDATE "${schema}".ai_system_registry SET risk_classification = $1, updated_at = NOW() WHERE id = $2`;
        return safeQuery(query, args);
    }
    static async query260(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_registry WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query261(schema, args) {
        const query = `INSERT INTO "${schema}".notification_queue (tenant_id, recipient_id, notification_type, subject, body, priority, channels)
         VALUES ($1, $2, 'ai_incident', $3, $4, 'critical', ARRAY['in_app','email'])`;
        return safeQuery(query, args);
    }
    static async query262(schema, args) {
        const query = `INSERT INTO "${schema}".ai_incident_classifications
     (tenant_id, incident_type, severity, classification_json, agent_id, nca_reportable, sama_reportable, sdaia_reportable, notification_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + ($9 || ' hours')::interval)`;
        return safeQuery(query, args);
    }
    static async query263(schema, args) {
        const query = `SELECT m.*, p.model_name, p.model_version
     FROM "${schema}".ai_model_modifications m
     JOIN "${schema}".ai_model_provenance p ON p.id = m.provenance_id
     WHERE m.system_id = $1 AND m.is_substantial = TRUE
     ORDER BY m.created_at DESC`;
        return safeQuery(query, args);
    }
    static async query264(schema, args) {
        const query = `SELECT m.*, p.model_name, p.model_version
     FROM "${schema}".ai_model_modifications m
     JOIN "${schema}".ai_model_provenance p ON p.id = m.provenance_id
     WHERE m.id = $1`;
        return safeQuery(query, args);
    }
    static async query265(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query266(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_modifications
       (provenance_id, system_id, modification_type, description,
        previous_version, new_version, is_substantial,
        substantial_justification, impact_assessment_id,
        approved_by, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query267(schema, args) {
        const query = `SELECT a.*, p.name_en AS provider_name, p.provider_code
     FROM "${schema}".ai_supplier_agreements a
     JOIN "${schema}".ai_provider_registry p ON p.id = a.provider_id
     WHERE a.status = 'active'
       AND a.expiry_date IS NOT NULL
       AND a.expiry_date <= now() + ($1 || ' days')::INTERVAL
     ORDER BY a.expiry_date ASC`;
        return safeQuery(query, args);
    }
    static async query268(schema, args) {
        const query = `UPDATE "${schema}".ai_supplier_agreements
     SET status = $2, updated_at = now()
     WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query269(schema, args) {
        const query = `SELECT a.*, p.name_en AS provider_name, p.provider_code
     FROM "${schema}".ai_supplier_agreements a
     JOIN "${schema}".ai_provider_registry p ON p.id = a.provider_id
     WHERE a.id = $1`;
        return safeQuery(query, args);
    }
    static async query270(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query271(schema, args) {
        const query = `INSERT INTO "${schema}".ai_supplier_agreements
       (provider_id, agreement_type, effective_date, expiry_date,
        data_processing_terms, sla_terms, audit_rights,
        sub_processor_notification, termination_conditions, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query272(schema, args) {
        const query = `UPDATE "${schema}".ai_provider_registry
     SET compliance_status = $2,
         risk_tier = COALESCE($3, risk_tier),
         last_assessed_at = now(),
         updated_at = now()
     WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query273(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_provider_registry WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query274(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query275(schema, args) {
        const query = `INSERT INTO "${schema}".ai_provider_registry
       (provider_code, name_en, name_ar, provider_type, country,
        eu_authorized_representative_name, eu_authorized_representative_address,
        compliance_status, risk_tier, contract_reference, contact_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query276(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_data_lineage WHERE system_id = $1 AND cross_border = TRUE`;
        return safeQuery(query, args);
    }
    static async query277(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_data_lineage WHERE system_id = $1`;
        return safeQuery(query, args);
    }
    static async query278(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_provider_registry`;
        return safeQuery(query, args);
    }
    static async query279(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_provenance WHERE system_id = $1`;
        return safeQuery(query, args);
    }
    static async query280(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_data_lineage WHERE system_id = $1`;
        return safeQuery(query, args);
    }
    static async query281(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_provenance WHERE system_id = $1`;
        return safeQuery(query, args);
    }
    static async query282(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_system_registry WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query283(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_data_lineage WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query284(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_model_provenance WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query285(schema, args) {
        const query = `INSERT INTO "${schema}".ai_data_lineage
       (system_id, dataset_name, source_type, source_uri, data_format,
        record_count, collection_method, collection_date,
        preprocessing_steps, transformations, quality_score, completeness_pct,
        pii_detected, pii_categories, consent_basis, retention_policy,
        cross_border, destination_countries, adequacy_decision_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query286(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_provenance
       (system_id, model_name, model_version, provider, model_type,
        architecture, training_framework, training_data_summary,
        parameters_count, license, license_url, sbom_format, sbom_content,
        hash_algorithm, model_hash, origin_country, data_residency_country,
        bias_assessment_status, fairness_metrics, performance_baseline,
        accuracy_threshold, is_open_source, is_fine_tuned,
        base_model_ref, environmental_impact, energy_consumption_kwh,
        digital_signature, signature_algorithm, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
     RETURNING id`;
        return safeQuery(query, args);
    }
    static async query287(schema, args) {
        const query = `SELECT risk_level FROM "${schema}".ai_vendor_assessments WHERE vendor_name = $1 ORDER BY assessed_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query288(schema, args) {
        const query = `SELECT vendor_name, risk_score, risk_level, assessed_at FROM "${schema}".ai_vendor_assessments ORDER BY assessed_at DESC`;
        return safeQuery(query, args);
    }
    static async query289(schema, args) {
        const query = `INSERT INTO "${schema}".ai_vendor_assessments (tenant_id, vendor_name, assessment_json, risk_score, risk_level, assessed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`;
        return safeQuery(query, args);
    }
    static async query290(schema, args) {
        const query = `SELECT data_residency_region, settings FROM "${schema}".tenant_ai_config WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
}
//# sourceMappingURL=auto-extracted.repo.js.map