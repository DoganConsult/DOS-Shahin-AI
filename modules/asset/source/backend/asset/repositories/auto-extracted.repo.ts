// Auto-extracted Asset repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class AssetAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE license_expiry IS NOT NULL AND license_expiry < CURRENT_DATE + INTERVAL '30 days')::int AS license_expiring,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active
    FROM "${schema}".applications WHERE deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".applications SET deleted_at = NOW() WHERE application_id = $1 AND deleted_at IS NULL RETURNING application_id`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".applications SET ${sets.join(', ')}, updated_at = NOW() WHERE application_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".applications (
      name, name_en, name_ar, app_type, vendor, version, environment,
      business_owner, technical_owner, department, criticality, status,
      hosting_type, hosting_provider, url, data_classification, compliance_status,
      license_type, license_expiry, linked_asset_ids, tags, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".applications WHERE application_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `
    SELECT * FROM "${schema}".applications WHERE ${where}
    ORDER BY ${sortCol} ${sortDir} LIMIT $${idx + 1} OFFSET $${idx + 2}
  `;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".applications WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".assets ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".assets ${where}`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assets WHERE asset_id = $1`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assets WHERE asset_id = $1`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assets WHERE asset_id = $1`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `
    SELECT
      c.code, c.name_en, c.level, c.color,
      COUNT(a.asset_id)::int AS asset_count
    FROM "${schema}".asset_classifications c
    LEFT JOIN "${schema}".assets a ON a.data_classification_id = c.classification_id AND a.deleted_at IS NULL
    GROUP BY c.classification_id, c.code, c.name_en, c.level, c.color
    ORDER BY c.level
  `;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".assets SET data_classification_id = $2, updated_at = NOW()
    WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id, data_classification_id
  `;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".asset_classifications SET ${sets.join(', ')}, updated_at = NOW() WHERE classification_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".asset_classifications (
      code, name_en, name_ar, description, level, color,
      handling_requirements, retention_period_days, requires_encryption, requires_dlp
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".asset_classifications WHERE classification_id = $1`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".asset_classifications ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `
    SELECT a.*, o.owner_user_id AS primary_owner
    FROM "${schema}".assets a
    LEFT JOIN "${schema}".asset_owners o ON o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.owner_type = 'business_owner' AND o.revoked_at IS NULL
    WHERE a.deleted_at IS NULL AND a.criticality IN ('critical','high')
    ORDER BY CASE a.criticality WHEN 'critical' THEN 0 ELSE 1 END, a.name
    LIMIT $1 OFFSET $2
  `;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".assets WHERE deleted_at IS NULL AND criticality IN ('critical','high')`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `
        UPDATE "${schema}".assets
        SET criticality = $2, compliance_score = $3, risk_score = $4, updated_at = NOW()
        WHERE asset_id = $1
      `;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT asset_id FROM "${schema}".assets WHERE deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `
    SELECT AVG(r.inherent_score)::numeric(5,2) AS avg_risk
    FROM "${schema}".risk_asset_links ral
    JOIN "${schema}".risks r ON r.risk_id = ral.risk_id
    WHERE ral.asset_id = $1
  `;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `
    SELECT COUNT(*)::int AS fan_out
    FROM "${schema}".asset_dependencies
    WHERE target_type = 'asset' AND target_id = $1 AND deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `
    SELECT asset_id, name, cia_confidentiality, cia_integrity, cia_availability
    FROM "${schema}".assets WHERE asset_id = $1 AND deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT
           COALESCE(classification, 'unclassified') AS classification,
           COUNT(*)::int AS count
         FROM "${schema}".assets
         WHERE status != 'decommissioned'
         GROUP BY classification
         ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'decommissioned')::int AS decommissioned,
           COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
           COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical,
           COUNT(*) FILTER (WHERE criticality = 'high')::int AS high,
           COUNT(*) FILTER (WHERE criticality = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE criticality = 'low')::int AS low,
           COUNT(*) FILTER (WHERE criticality IS NULL OR criticality = 'unclassified')::int AS unclassified,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_added
         FROM "${schema}".assets`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT from_stage AS "fromStage", to_stage AS "toStage", changed_by AS "changedBy", changed_at AS "changedAt" FROM "${schema}".asset_lifecycle_events WHERE asset_id = $1 ORDER BY changed_at ASC`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".asset_lifecycle_events (asset_id, from_stage, to_stage, changed_by, changed_at) VALUES ($1,$2,$3,$4,NOW())`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".assets SET lifecycle_stage = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT lifecycle_stage FROM "${schema}".assets WHERE id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT lifecycle_stage AS stage, COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL GROUP BY lifecycle_stage ORDER BY lifecycle_stage`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risk_asset_links (risk_id, asset_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (risk_id, asset_id) DO UPDATE SET link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `
    SELECT l.*, r.title AS risk_title, r.status AS risk_status, r.inherent_score
    FROM "${schema}".risk_asset_links l
    LEFT JOIN "${schema}".risks r ON r.risk_id = l.risk_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".control_asset_links (control_id, asset_id, asset_type, link_purpose, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT DO NOTHING
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `
    SELECT l.*, c.name AS control_name, c.status AS control_status
    FROM "${schema}".control_asset_links l
    LEFT JOIN "${schema}".controls c ON c.control_id = l.control_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".asset_evidence_links WHERE link_id = $1`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".asset_evidence_links (asset_id, evidence_task_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (asset_id, evidence_task_id) DO UPDATE SET link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `
    SELECT l.*, et.title AS evidence_title, et.status AS evidence_status
    FROM "${schema}".asset_evidence_links l
    LEFT JOIN "${schema}".evidence_tasks et ON et.task_id = l.evidence_task_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".asset_vendor_links WHERE link_id = $1`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".asset_vendor_links (asset_id, vendor_id, link_type, contract_ref, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (asset_id, vendor_id, link_type) DO UPDATE SET notes = EXCLUDED.notes, contract_ref = EXCLUDED.contract_ref
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `
    SELECT l.*, v.name AS vendor_name, v.status AS vendor_status
    FROM "${schema}".asset_vendor_links l
    LEFT JOIN "${schema}".vendors v ON v.vendor_id = l.vendor_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(DISTINCT CASE WHEN entity_type = 'asset' THEN entity_id END)::int AS owned_assets,
      COUNT(DISTINCT CASE WHEN entity_type = 'application' THEN entity_id END)::int AS owned_applications,
      COUNT(DISTINCT CASE WHEN entity_type = 'business_service' THEN entity_id END)::int AS owned_services,
      COUNT(DISTINCT owner_user_id)::int AS unique_owners
    FROM "${schema}".asset_owners WHERE revoked_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `
    SELECT e.* FROM "${schema}".${table} e
    WHERE e.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM "${schema}".asset_owners o WHERE o.entity_type = $1 AND o.entity_id = e.${idCol} AND o.revoked_at IS NULL
    )
    ORDER BY e.created_at DESC LIMIT $2 OFFSET $3
  `;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `
    SELECT COUNT(*)::int AS total FROM "${schema}".${table} e
    WHERE e.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM "${schema}".asset_owners o WHERE o.entity_type = $1 AND o.entity_id = e.${idCol} AND o.revoked_at IS NULL
    )
  `;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".asset_owners SET revoked_at = NOW()
    WHERE ownership_id = $1 AND revoked_at IS NULL RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".asset_owners (entity_type, entity_id, owner_type, owner_user_id, assigned_by, notes)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".asset_owners
    SET revoked_at = NOW()
    WHERE entity_type = $1 AND entity_id = $2 AND owner_type = $3 AND revoked_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `
    SELECT * FROM "${schema}".asset_owners
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `
    SELECT * FROM "${schema}".asset_owners
    WHERE entity_type = $1 AND entity_id = $2 AND revoked_at IS NULL
    ORDER BY owner_type
  `;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE owner IS NULL OR owner = '')::int AS without_owner,
      COUNT(*) FILTER (WHERE external_exposure = true)::int AS externally_exposed,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'decommission' OR lifecycle_stage = 'disposed')::int AS retired,
      COUNT(*) FILTER (WHERE last_scan_at IS NULL OR last_scan_at < NOW() - INTERVAL '90 days')::int AS scan_overdue,
      COUNT(*) FILTER (WHERE data_classification_id IS NULL)::int AS unclassified
    FROM "${schema}".assets WHERE deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".assets SET deleted_at = NOW() WHERE asset_id = ANY($1) AND deleted_at IS NULL RETURNING asset_id`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".assets SET deleted_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".assets SET ${sets.join(', ')}, updated_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".assets (
      name, name_en, name_ar, type, asset_category, description, criticality,
      owner, custodian_id, department, location, ip_address, mac_address, os,
      classification, status, lifecycle_stage, business_service_id,
      data_classification_id, parent_asset_id,
      cia_confidentiality, cia_integrity, cia_availability,
      external_exposure, cmdb_external_id, valuation_amount, valuation_currency,
      tags, metadata, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
    ) RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `
    SELECT a.*,
           c.name_en AS classification_name, c.level AS classification_level, c.code AS classification_code
    FROM "${schema}".assets a
    LEFT JOIN "${schema}".asset_classifications c ON c.classification_id = a.data_classification_id
    WHERE a.asset_id = $1 AND a.deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `
    SELECT a.*,
           c.name_en AS classification_name, c.level AS classification_level,
           o.owner_user_id AS primary_owner_id
    FROM "${schema}".assets a
    LEFT JOIN "${schema}".asset_classifications c ON c.classification_id = a.data_classification_id
    LEFT JOIN "${schema}".asset_owners o ON o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.owner_type = 'business_owner' AND o.revoked_at IS NULL
    WHERE ${where}
    ORDER BY a.${sortCol} ${sortDir}
    LIMIT $${idx + 1} OFFSET $${idx + 2}
  `;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".assets a WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `
    SELECT
      (SELECT COUNT(*)::int FROM "${schema}".assets WHERE deleted_at IS NULL) AS total_assets,
      (SELECT COUNT(*)::int FROM "${schema}".applications WHERE deleted_at IS NULL) AS total_applications,
      (SELECT COUNT(*)::int FROM "${schema}".business_services WHERE deleted_at IS NULL) AS total_services,
      (SELECT COUNT(*)::int FROM "${schema}".asset_dependencies WHERE deleted_at IS NULL) AS total_dependencies,
      (SELECT COUNT(*)::int FROM "${schema}".assets WHERE deleted_at IS NULL AND criticality IN ('critical','high')) AS critical_assets,
      (SELECT COUNT(*)::int FROM "${schema}".assets WHERE deleted_at IS NULL AND external_exposure = true) AS exposed_assets,
      (SELECT COUNT(*)::int FROM "${schema}".assets WHERE deleted_at IS NULL AND data_classification_id IS NULL) AS unclassified_assets,
      (SELECT COUNT(DISTINCT entity_id)::int FROM "${schema}".asset_owners WHERE entity_type = 'asset' AND revoked_at IS NULL) AS owned_assets
  `;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COALESCE(c.name_en, 'Unclassified') AS classification,
      COALESCE(c.level, 0) AS level,
      COALESCE(c.color, '#9ca3af') AS color,
      COUNT(a.asset_id)::int AS count,
      COUNT(*) FILTER (WHERE a.criticality IN ('critical','high'))::int AS critical_high
    FROM "${schema}".assets a
    LEFT JOIN "${schema}".asset_classifications c ON c.classification_id = a.data_classification_id
    WHERE a.deleted_at IS NULL
    GROUP BY c.name_en, c.level, c.color
    ORDER BY COALESCE(c.level, 0)
  `;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `
    SELECT application_id AS entity_id, name, app_type AS type, criticality, 'application' AS entity_type
    FROM "${schema}".applications
    WHERE deleted_at IS NULL AND (linked_asset_ids IS NULL OR linked_asset_ids = '{}')
    ORDER BY criticality DESC, name
  `;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `
    SELECT a.asset_id, a.name, a.type, a.criticality, 'asset' AS entity_type
    FROM "${schema}".assets a
    WHERE a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM "${schema}".control_asset_links cal WHERE cal.asset_id = a.asset_id)
      AND NOT EXISTS (SELECT 1 FROM "${schema}".risk_asset_links ral WHERE ral.asset_id = a.asset_id)
      AND NOT EXISTS (SELECT 1 FROM "${schema}".asset_owners o WHERE o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.revoked_at IS NULL)
    ORDER BY a.criticality DESC, a.name
  `;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `
    SELECT
      a.asset_id, a.name, a.type, a.criticality,
      a.acquisition_date,
      a.last_scan_at,
      EXTRACT(DAYS FROM NOW() - a.created_at)::int AS age_days,
      CASE
        WHEN a.last_scan_at IS NULL THEN 'never_scanned'
        WHEN a.last_scan_at < NOW() - INTERVAL '90 days' THEN 'overdue'
        WHEN a.last_scan_at < NOW() - INTERVAL '30 days' THEN 'due_soon'
        ELSE 'current'
      END AS scan_status
    FROM "${schema}".assets a WHERE a.deleted_at IS NULL
    ORDER BY a.last_scan_at ASC NULLS FIRST
  `;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `
    SELECT
      a.asset_id, a.name, a.type, a.criticality, a.lifecycle_stage,
      (SELECT COUNT(*)::int FROM "${schema}".control_asset_links cal WHERE cal.asset_id = a.asset_id) AS control_count,
      (SELECT COUNT(*)::int FROM "${schema}".risk_asset_links ral WHERE ral.asset_id = a.asset_id) AS risk_count,
      (SELECT COUNT(*)::int FROM "${schema}".asset_vendor_links avl WHERE avl.asset_id = a.asset_id) AS vendor_count,
      (SELECT COUNT(*)::int FROM "${schema}".asset_evidence_links ael WHERE ael.asset_id = a.asset_id) AS evidence_count,
      EXISTS(SELECT 1 FROM "${schema}".asset_owners o WHERE o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.revoked_at IS NULL) AS has_owner,
      a.data_classification_id IS NOT NULL AS has_classification
    FROM "${schema}".assets a WHERE a.deleted_at IS NULL
    ORDER BY a.criticality DESC, a.name
  `;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE service_type = 'core')::int AS core_services,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE sla_target_uptime IS NOT NULL AND sla_target_uptime >= 99.9)::int AS high_sla
    FROM "${schema}".business_services WHERE deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".business_services SET deleted_at = NOW() WHERE service_id = $1 AND deleted_at IS NULL RETURNING service_id`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".business_services SET ${sets.join(', ')}, updated_at = NOW() WHERE service_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".business_services (
      name, name_en, name_ar, description, service_type,
      business_owner, technical_owner, department, criticality, status,
      sla_target_uptime, rto_hours, rpo_hours, parent_service_id,
      linked_application_ids, linked_asset_ids, tags, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `
    WITH RECURSIVE tree AS (
      SELECT *, 0 AS depth FROM "${schema}".business_services WHERE parent_service_id IS NULL AND deleted_at IS NULL
      UNION ALL
      SELECT s.*, t.depth + 1 FROM "${schema}".business_services s
      JOIN tree t ON s.parent_service_id = t.service_id
      WHERE s.deleted_at IS NULL AND t.depth < 10
    )
    SELECT * FROM tree ORDER BY depth, name
  `;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `
      WITH RECURSIVE tree AS (
        SELECT *, 0 AS depth FROM "${schema}".business_services WHERE service_id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT s.*, t.depth + 1 FROM "${schema}".business_services s
        JOIN tree t ON s.parent_service_id = t.service_id
        WHERE s.deleted_at IS NULL AND t.depth < 10
      )
      SELECT * FROM tree ORDER BY depth, name
    `;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".business_services WHERE service_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `
    SELECT * FROM "${schema}".business_services WHERE ${where}
    ORDER BY ${sortCol} ${sortDir} LIMIT $${idx + 1} OFFSET $${idx + 2}
  `;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".business_services WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS total_edges,
      COUNT(DISTINCT source_type || ':' || source_id::text)::int AS unique_sources,
      COUNT(DISTINCT target_type || ':' || target_id::text)::int AS unique_targets,
      COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_deps,
      COUNT(*) FILTER (WHERE dependency_type = 'depends_on')::int AS hard_dependencies
    FROM "${schema}".asset_dependencies WHERE deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `
    WITH RECURSIVE chain AS (
      SELECT source_type, source_id, target_type, target_id,
             ARRAY[source_type || ':' || source_id::text] AS path,
             false AS is_cycle
      FROM "${schema}".asset_dependencies WHERE deleted_at IS NULL
      UNION ALL
      SELECT d.source_type, d.source_id, d.target_type, d.target_id,
             c.path || (d.source_type || ':' || d.source_id::text),
             (d.target_type || ':' || d.target_id::text) = ANY(c.path)
      FROM "${schema}".asset_dependencies d
      JOIN chain c ON d.source_type = c.target_type AND d.source_id = c.target_id
      WHERE d.deleted_at IS NULL AND NOT c.is_cycle AND array_length(c.path, 1) < 20
    )
    SELECT DISTINCT path || (target_type || ':' || target_id::text) AS cycle_path
    FROM chain WHERE is_cycle
  `;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `
    WITH RECURSIVE chain AS (
      SELECT dependency_id, source_type, source_id, target_type, target_id,
             dependency_type, criticality, 1 AS depth
      FROM "${schema}".asset_dependencies
      WHERE source_type = $1 AND source_id = $2 AND deleted_at IS NULL
      UNION ALL
      SELECT d.dependency_id, d.source_type, d.source_id, d.target_type, d.target_id,
             d.dependency_type, d.criticality, c.depth + 1
      FROM "${schema}".asset_dependencies d
      JOIN chain c ON d.source_type = c.target_type AND d.source_id = c.target_id
      WHERE d.deleted_at IS NULL AND c.depth < $3
    )
    SELECT * FROM chain ORDER BY depth
  `;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `
    WITH RECURSIVE chain AS (
      SELECT dependency_id, source_type, source_id, target_type, target_id,
             dependency_type, criticality, 1 AS depth
      FROM "${schema}".asset_dependencies
      WHERE target_type = $1 AND target_id = $2 AND deleted_at IS NULL
      UNION ALL
      SELECT d.dependency_id, d.source_type, d.source_id, d.target_type, d.target_id,
             d.dependency_type, d.criticality, c.depth + 1
      FROM "${schema}".asset_dependencies d
      JOIN chain c ON d.target_type = c.source_type AND d.target_id = c.source_id
      WHERE d.deleted_at IS NULL AND c.depth < $3
    )
    SELECT * FROM chain ORDER BY depth
  `;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".asset_dependencies SET deleted_at = NOW() WHERE dependency_id = $1 AND deleted_at IS NULL RETURNING dependency_id`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".asset_dependencies (
      source_type, source_id, target_type, target_id,
      dependency_type, criticality, direction, notes, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (source_type, source_id, target_type, target_id, dependency_type) WHERE deleted_at IS NULL
    DO UPDATE SET notes = EXCLUDED.notes, criticality = EXCLUDED.criticality, updated_at = NOW()
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `
    SELECT * FROM "${schema}".asset_dependencies WHERE ${where}
    ORDER BY created_at DESC LIMIT $${idx + 1} OFFSET $${idx + 2}
  `;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".asset_dependencies WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `
    SELECT
      (SELECT COUNT(*)::int FROM "${schema}".business_services WHERE deleted_at IS NULL) AS total_services,
      (SELECT COUNT(*)::int FROM "${schema}".applications WHERE deleted_at IS NULL) AS total_applications,
      (SELECT COUNT(*)::int FROM "${schema}".assets WHERE deleted_at IS NULL) AS total_assets,
      (SELECT COUNT(*)::int FROM "${schema}".asset_dependencies WHERE deleted_at IS NULL) AS total_dependencies
  `;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT asset_id, name, criticality, type FROM "${schema}".assets WHERE asset_id = ANY($1) AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT application_id, name, criticality, environment FROM "${schema}".applications WHERE application_id = ANY($1) AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `
    WITH RECURSIVE tree AS (
      SELECT service_id, name, criticality, 1 AS depth
      FROM "${schema}".business_services WHERE parent_service_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT s.service_id, s.name, s.criticality, t.depth + 1
      FROM "${schema}".business_services s JOIN tree t ON s.parent_service_id = t.service_id
      WHERE s.deleted_at IS NULL AND t.depth < 5
    )
    SELECT * FROM tree ORDER BY depth
  `;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".business_services WHERE service_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `
    SELECT asset_id, name, type, criticality, status, business_service_id
    FROM "${schema}".assets WHERE deleted_at IS NULL ORDER BY name
  `;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `
    SELECT application_id, name, app_type, criticality, status, environment, linked_asset_ids
    FROM "${schema}".applications WHERE deleted_at IS NULL ORDER BY name
  `;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `
    SELECT service_id, name, service_type, criticality, status,
           sla_target_uptime, rto_hours, rpo_hours, parent_service_id,
           linked_application_ids, linked_asset_ids
    FROM "${schema}".business_services WHERE deleted_at IS NULL ORDER BY name
  `;
    return safeQuery(query, args);
  }

}
