import { logger } from '../../ports/logger.port';
/**
 * Qiyas Models, Domains, and Model Versioning service.
 * Manages maturity model CRUD, domain structure, and version lifecycle.
 */
import { query as _query, safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasModelsService {
  // ═══ Models ═══

  async listModels(schema: string, filters?: { status?: string; model_type?: string }) {
    let sql = `SELECT * FROM "${schema}".qiyas_models WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
    if (filters?.model_type) { params.push(filters.model_type); sql += ` AND model_type = $${params.length}`; }
    sql += ` ORDER BY created_at DESC`;
    return (await safeQuery(sql, params)).rows;
  }

  async getModel(schema: string, modelId: string) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".qiyas_models WHERE model_id = $1::uuid`, [modelId]
    );
    return result.rows[0] ?? null;
  }

  async createModel(schema: string, data: unknown) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".qiyas_models (code, name_en, name_ar, description_en, description_ar, model_type, owner, status, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
       RETURNING *`,

      [data.code, data.name_en, data.name_ar || null, data.description_en || null, data.description_ar || null,

       data.model_type || 'maturity', data.owner || null, data.status || 'draft',

       JSON.stringify(data.tags || []), JSON.stringify(data.metadata || {})]
    );
    return result.rows[0];
  }

  async updateModel(schema: string, modelId: string, data: unknown) {
    const result = await safeQuery(
      `UPDATE "${schema}".qiyas_models
       SET name_en = COALESCE($2, name_en), name_ar = COALESCE($3, name_ar),
           description_en = COALESCE($4, description_en), description_ar = COALESCE($5, description_ar),
           model_type = COALESCE($6, model_type), status = COALESCE($7, status),
           tags = COALESCE($8::jsonb, tags), metadata = COALESCE($9::jsonb, metadata),
           updated_at = now()
       WHERE model_id = $1::uuid RETURNING *`,

      [modelId, data.name_en, data.name_ar, data.description_en, data.description_ar,

       data.model_type, data.status,

       data.tags ? JSON.stringify(data.tags) : null, data.metadata ? JSON.stringify(data.metadata) : null]
    );
    return result.rows[0] ?? null;
  }

  // ═══ Model Domains ═══

  async listDomains(schema: string, modelId: string) {
    return (await safeQuery(
      `SELECT * FROM "${schema}".qiyas_domains WHERE model_id = $1::uuid ORDER BY sort_order`, [modelId]
    )).rows;
  }

  async createDomain(schema: string, modelId: string, data: unknown) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".qiyas_domains (model_id, code, name_en, name_ar, description_en, description_ar, sort_order, weight)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,

      [modelId, data.code, data.name_en, data.name_ar || null, data.description_en || null,

       data.description_ar || null, data.sort_order ?? 0, data.weight ?? 1.0]
    );
    return result.rows[0];
  }

  // ═══ Model Versioning ═══

  /** Create a new version for a model */
  async createModelVersion(schema: string, modelId: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_model_versions
           (model_id, version_number, change_notes, status, created_by, snapshot_data)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,

        [modelId, data.version_number, data.change_notes || null,

         data.status || 'draft', data.created_by || null,

         JSON.stringify(data.snapshot_data || {})]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasModelsService] createModelVersion failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Publish a model version: mark as published and supersede previous published version */
  async publishModelVersion(schema: string, versionId: string): Promise<unknown> {
    try {
      // Get the version to find its model_id
      const versionResult = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_model_versions WHERE version_id = $1::uuid`,
        [versionId]
      );
      const version = versionResult.rows[0];
      if (!version) throw new Error(`Model version ${versionId} not found`);

      // Supersede any previously published versions for this model
      await safeQuery(
        `UPDATE "${schema}".qiyas_model_versions
         SET status = 'superseded', updated_at = NOW()
         WHERE model_id = $1::uuid AND status = 'published' AND version_id != $2::uuid`,
        [version.model_id, versionId]
      );

      // Publish the target version
      const publishResult = await safeQuery(
        `UPDATE "${schema}".qiyas_model_versions
         SET status = 'published', published_at = NOW(), updated_at = NOW()
         WHERE version_id = $1::uuid
         RETURNING *`,
        [versionId]
      );
      return publishResult.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasModelsService] publishModelVersion failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** List all versions for a model, newest first */
  async listModelVersions(schema: string, modelId: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_model_versions
         WHERE model_id = $1::uuid
         ORDER BY version_number DESC`,
        [modelId]
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasModelsService] listModelVersions failed: ${toErrorMessage(err)}`);
      return [];
    }
  }
}
