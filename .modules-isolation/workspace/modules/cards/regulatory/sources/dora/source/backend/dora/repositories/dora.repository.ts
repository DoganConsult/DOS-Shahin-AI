import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class DoraIctAssetRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findById(assetId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_ict_assets WHERE asset_id = $1 AND deleted_at IS NULL`, [assetId]);
    return getFirstRow(result);
  }

  async findAll(filters: {
    status?: string; criticality?: string; asset_type?: string; vendor?: string;
    search?: string; page?: number; pageSize?: number; sortBy?: string; sortDir?: string;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.criticality) { conditions.push(`criticality = $${idx++}`); params.push(filters.criticality); }
    if (filters.asset_type) { conditions.push(`asset_type = $${idx++}`); params.push(filters.asset_type); }
    if (filters.vendor) { conditions.push(`vendor ILIKE $${idx++}`); params.push(`%${filters.vendor}%`); }
    if (filters.search) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const sortCol = ['name', 'criticality', 'status', 'created_at', 'updated_at'].includes(filters.sortBy || '') ? filters.sortBy! : 'created_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_ict_assets ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_ict_assets ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".dora_ict_assets
        (name, asset_type, criticality, vendor, description, owner_id, network_zone, data_classification, third_party_provider, contract_ref, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [data.name, data.assetType || 'hardware', data.criticality || 'medium', data.vendor || null, data.description || null,
       data.owner_id || null, data.network_zone || null, data.data_classification || null,
       data.third_party_provider || null, data.contract_ref || null, 'active']);
    return getFirstRow(result);
  }

  async update(assetId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const allowed = ['name', 'asset_type', 'criticality', 'vendor', 'description', 'status', 'owner_id', 'network_zone', 'data_classification', 'third_party_provider', 'contract_ref'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      const col = k === 'assetType' ? 'asset_type' : k;
      if (allowed.includes(col)) { sets.push(`${col} = $${idx++}`); params.push(v); }
    }
    if (sets.length === 0) return this.findById(assetId);
    sets.push(`updated_at = NOW()`);
    params.push(assetId);
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_ict_assets SET ${sets.join(', ')} WHERE asset_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return getFirstRow(result);
  }

  async softDelete(assetId: string, _deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_ict_assets SET deleted_at = NOW(), updated_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id`,
      [assetId]);
    return (result.rows?.length ?? 0) > 0;
  }

  async count(filters: { status?: string; criticality?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.criticality) { conditions.push(`criticality = $${idx++}`); params.push(filters.criticality); }
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_ict_assets WHERE ${conditions.join(' AND ')}`, params);
    return getFirstRow(result)?.total ?? 0;
  }
}

export class DoraResilienceTestRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findById(testId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_resilience_tests WHERE test_id = $1 AND deleted_at IS NULL`, [testId]);
    return getFirstRow(result);
  }

  async findAll(filters: {
    status?: string; test_type?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.test_type) { conditions.push(`test_type = $${idx++}`); params.push(filters.test_type); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_resilience_tests ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_resilience_tests ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".dora_resilience_tests
        (title, test_type, scope, scheduled_date, methodology, scope_assets, test_plan, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'planned') RETURNING *`,
      [data.title, data.testType || 'scenario', data.scope || 'full', data.scheduledDate || null,
       data.methodology || null, JSON.stringify(data.assetIds || []), JSON.stringify(data.test_plan || {})]);
    return getFirstRow(result);
  }

  async updateStatus(testId: string, status: string, extra?: Record<string, unknown>): Promise<GenericRow | null> {
    const sets = ['status = $1', 'updated_at = NOW()'];
    const params: unknown[] = [status];
    let idx = 2;
    if (status === 'in_progress') { sets.push(`started_at = COALESCE(started_at, NOW())`); }
    if (status === 'completed') { sets.push(`completed_at = NOW()`); }
    if (extra?.result) { sets.push(`result = $${idx++}`); params.push(extra.result); }
    if (extra?.findings_count !== undefined) { sets.push(`findings_count = $${idx++}`); params.push(extra.findings_count); }
    if (extra?.results_summary) { sets.push(`results_summary = $${idx++}`); params.push(JSON.stringify(extra.results_summary)); }
    params.push(testId);
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_resilience_tests SET ${sets.join(', ')} WHERE test_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return getFirstRow(result);
  }
}

export class DoraMajorIncidentRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findById(incidentId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_major_incidents WHERE incident_id = $1 AND deleted_at IS NULL`, [incidentId]);
    return getFirstRow(result);
  }

  async findAll(filters: {
    status?: string; severity?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_major_incidents ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_major_incidents ${where} ORDER BY reported_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".dora_major_incidents
        (title, severity, classification, root_cause, affected_users_count, financial_impact, data_loss, cross_border, assignee_id, reporter_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [data.title, data.severity || 'high', data.classification || 'ict_disruption', data.root_cause || null,
       data.affected_users_count ?? 0, data.financial_impact || null, data.data_loss ?? false,
       data.cross_border ?? false, data.assignee_id || null, data.reporter_id || null]);
    return getFirstRow(result);
  }

  async update(incidentId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const allowed = ['title', 'severity', 'classification', 'status', 'root_cause', 'affected_users_count',
      'financial_impact', 'data_loss', 'cross_border', 'reported_to_authority', 'authority_ref',
      'lessons_learned', 'assignee_id', 'escalation_level'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (allowed.includes(k)) { sets.push(`${k} = $${idx++}`); params.push(v); }
    }
    if (data.status === 'resolved') { sets.push(`resolved_at = COALESCE(resolved_at, NOW())`); }
    if (sets.length === 0) return this.findById(incidentId);
    sets.push(`updated_at = NOW()`);
    params.push(incidentId);
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_major_incidents SET ${sets.join(', ')} WHERE incident_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return getFirstRow(result);
  }

  async openCount(): Promise<number> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_major_incidents WHERE status NOT IN ('resolved','closed') AND deleted_at IS NULL`);
    return getFirstRow(result)?.total ?? 0;
  }
}

export class DoraThreatIntelRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findAll(filters: {
    acknowledged?: boolean; severity?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.acknowledged !== undefined) { conditions.push(`acknowledged = $${idx++}`); params.push(filters.acknowledged); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_threat_intel ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_threat_intel ${where} ORDER BY received_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".dora_threat_intel
        (source, threat_type, severity, description, tlp_classification, confidence_score, indicators, recommended_actions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [data.source, data.threat_type || 'generic', data.severity || 'medium', data.description,
       data.tlp_classification || 'amber', data.confidence_score || null,
       JSON.stringify(data.indicators || []), JSON.stringify(data.recommended_actions || [])]);
    return getFirstRow(result);
  }

  async acknowledge(intelId: string, userId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_threat_intel SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW(), updated_at = NOW()
       WHERE intel_id = $2 AND deleted_at IS NULL RETURNING *`, [userId, intelId]);
    return getFirstRow(result);
  }

  async unacknowledgedCount(): Promise<number> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_threat_intel WHERE acknowledged = false AND deleted_at IS NULL`);
    return getFirstRow(result)?.total ?? 0;
  }
}

export class DoraBackupConfigRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findAll(filters: { status?: string; asset_id?: string; page?: number; pageSize?: number } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.asset_id) { conditions.push(`asset_id = $${idx++}`); params.push(filters.asset_id); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_backup_configs ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_backup_configs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".dora_backup_configs
        (asset_id, backup_type, frequency, retention_days, encryption_enabled, storage_location, offsite_copy, rpo_hours, rto_hours, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active') RETURNING *`,
      [data.asset_id || null, data.backup_type || 'full', data.frequency || 'daily',
       data.retention_days ?? 90, data.encryption_enabled ?? true,
       data.storage_location || null, data.offsite_copy ?? false,
       data.rpo_hours || null, data.rto_hours || null]);
    return getFirstRow(result);
  }

  async update(configId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const allowed = ['backup_type', 'frequency', 'retention_days', 'encryption_enabled', 'storage_location',
      'offsite_copy', 'rpo_hours', 'rto_hours', 'status', 'last_restore_test_result'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (allowed.includes(k)) { sets.push(`${k} = $${idx++}`); params.push(v); }
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = NOW()`);
    params.push(configId);
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_backup_configs SET ${sets.join(', ')} WHERE config_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return getFirstRow(result);
  }
}

export class DoraThirdPartyProviderRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findById(providerId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_ict_third_party_register WHERE provider_id = $1 AND deleted_at IS NULL`, [providerId]);
    return getFirstRow(result);
  }

  async findAll(filters: {
    criticality?: string; provider_type?: string; compliance_status?: string;
    search?: string; page?: number; pageSize?: number; sortBy?: string; sortDir?: string;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.criticality) { conditions.push(`criticality = $${idx++}`); params.push(filters.criticality); }
    if (filters.provider_type) { conditions.push(`provider_type = $${idx++}`); params.push(filters.provider_type); }
    if (filters.compliance_status) { conditions.push(`compliance_status = $${idx++}`); params.push(filters.compliance_status); }
    if (filters.search) { conditions.push(`(provider_name ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const sortCol = ['provider_name', 'criticality', 'compliance_status', 'contract_end', 'created_at'].includes(filters.sortBy || '') ? filters.sortBy! : 'created_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".dora_ict_third_party_register ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".dora_ict_third_party_register ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".dora_ict_third_party_register
        (provider_name, provider_type, jurisdiction, criticality, services_provided,
         contract_start, contract_end, exit_strategy, substitutability, subcontractors,
         audit_rights, last_audit_date, risk_assessment, compliance_status, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [data.provider_name, data.provider_type || 'cloud_service', data.jurisdiction || null,
       data.criticality || 'medium', JSON.stringify(data.services_provided || []),
       data.contract_start || null, data.contract_end || null, data.exit_strategy || null,
       data.substitutability || 'medium', JSON.stringify(data.subcontractors || []),
       data.audit_rights ?? false, data.last_audit_date || null,
       JSON.stringify(data.risk_assessment || {}), data.compliance_status || 'pending_review',
       data.owner_id || null]);
    return getFirstRow(result);
  }

  async update(providerId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const allowed = ['provider_name', 'provider_type', 'jurisdiction', 'criticality',
      'services_provided', 'contract_start', 'contract_end', 'exit_strategy',
      'substitutability', 'subcontractors', 'audit_rights', 'last_audit_date',
      'risk_assessment', 'compliance_status', 'owner_id'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (allowed.includes(k)) {
        const val = (k === 'services_provided' || k === 'subcontractors' || k === 'risk_assessment') ? JSON.stringify(v) : v;
        sets.push(`${k} = $${idx++}`); params.push(val);
      }
    }
    if (sets.length === 0) return this.findById(providerId);
    sets.push(`updated_at = NOW()`);
    params.push(providerId);
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_ict_third_party_register SET ${sets.join(', ')} WHERE provider_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return getFirstRow(result);
  }

  async softDelete(providerId: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".dora_ict_third_party_register SET deleted_at = NOW(), updated_at = NOW() WHERE provider_id = $1 AND deleted_at IS NULL RETURNING provider_id`,
      [providerId]);
    return (result.rows?.length ?? 0) > 0;
  }
}
