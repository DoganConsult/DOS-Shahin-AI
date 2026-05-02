import { logger } from './ports/logger.port';
// ============================================
// PackRegistryService — Sync pack JSON files to DB + CRUD
// ============================================

import { readFile, readdir, stat as _stat } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { query as _query, safeQuery } from './ports/database.port';
import {
  PackManifest,
  PackRegistryRow,
  PackArtifactRow,
  PackFilter,
  SyncResult,
  PACK_LAYER_ORDER,
  PackType,
} from './pack-registry.types';

export class PackRegistryService {
  private readonly packsDir: string;

  constructor(packsDir?: string) {
    this.packsDir = packsDir ?? path.resolve(__dirname, '../../packs');
  }

  // ─── Boot Sync: JSON files → DB ─────────────────────────────

  async syncFromDisk(): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, unchanged: 0, errors: [] };

    const packDirs = await this.discoverPackDirs(this.packsDir);

    for (const packDir of packDirs) {
      try {
        const manifestPath = path.join(packDir, 'manifest.json');
        const raw = await readFile(manifestPath, 'utf-8');
        const manifest: PackManifest = JSON.parse(raw);

        // Compute hash of entire pack directory
        const hash = await this.computePackHash(packDir, manifest);

        // Check if pack already exists in DB
        const existing = await safeQuery(
          `SELECT pack_id, hash FROM public.pack_registry WHERE code = $1 AND version = $2`,
          [manifest.code, manifest.version]
        );

        if (existing.rows.length > 0 && existing.rows[0].hash === hash) {
          result.unchanged++;
          continue;
        }

        const layer = manifest.layer ?? PACK_LAYER_ORDER[manifest.type as PackType] ?? 0;

        if (existing.rows.length > 0) {
          // Update existing pack
          await safeQuery(
            `UPDATE public.pack_registry SET
              pack_type = $3, pack_layer = $4, hash = $5, name_en = $6, name_ar = $7,
              description_en = $8, description_ar = $9, depends_on = $10, applies_to = $11::jsonb,
              compat = $12::jsonb, manifest_json = $13::jsonb, updated_at = NOW()
            WHERE code = $1 AND version = $2`,
            [
              manifest.code, manifest.version, manifest.type, layer, hash,
              manifest.name_en, manifest.name_ar, manifest.description_en ?? null,
              manifest.description_ar ?? null, manifest.depends_on ?? [],
              JSON.stringify(manifest.applies_to ?? {}),
              JSON.stringify(manifest.compat ?? {}),
              JSON.stringify(manifest),
            ]
          );

          // Re-sync artifacts
          await this.syncArtifacts(existing.rows[0].pack_id, packDir, manifest);
          result.updated++;
        } else {
          // Insert new pack
          const insertResult = await safeQuery(
            `INSERT INTO public.pack_registry
              (code, version, pack_type, pack_layer, hash, name_en, name_ar, description_en, description_ar,
               depends_on, applies_to, compat, manifest_json, is_active, is_system)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,true,true)
            RETURNING pack_id`,
            [
              manifest.code, manifest.version, manifest.type, layer, hash,
              manifest.name_en, manifest.name_ar, manifest.description_en ?? null,
              manifest.description_ar ?? null, manifest.depends_on ?? [],
              JSON.stringify(manifest.applies_to ?? {}),
              JSON.stringify(manifest.compat ?? {}),
              JSON.stringify(manifest),
            ]
          );

          const packId = insertResult.rows[0].pack_id;
          await this.syncArtifacts(packId, packDir, manifest);
          result.added++;
        }
      } catch (err: unknown) {
        result.errors.push(`${packDir}: ${(err instanceof Error ? err.message : String(err))}`);
      }
    }

    logger.info(`[PackRegistry] Sync complete: +${result.added} ~${result.updated} =${result.unchanged} !${result.errors.length}`);
    return result;
  }

  // ─── CRUD ───────────────────────────────────────────────────

  async listPacks(filter?: PackFilter): Promise<PackRegistryRow[]> {
    let sql = `SELECT * FROM public.pack_registry WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;

    if (filter?.type) {
      sql += ` AND pack_type = $${idx++}`;
      params.push(filter.type);
    }
    if (filter?.is_active !== undefined) {
      sql += ` AND is_active = $${idx++}`;
      params.push(filter.is_active);
    }
    if (filter?.applies_to_country) {
      sql += ` AND (applies_to->'countries' ? $${idx++} OR applies_to = '{}'::jsonb)`;
      params.push(filter.applies_to_country);
    }
    if (filter?.applies_to_industry) {
      sql += ` AND (applies_to->'industries' ? $${idx++} OR applies_to = '{}'::jsonb)`;
      params.push(filter.applies_to_industry);
    }
    if (filter?.applies_to_regulator) {
      sql += ` AND (applies_to->'regulators' ? $${idx++} OR applies_to = '{}'::jsonb)`;
      params.push(filter.applies_to_regulator);
    }

    sql += ` ORDER BY pack_layer ASC, code ASC`;
    const result = await safeQuery(sql, params);
    return result.rows;
  }

  async getPackByCode(code: string): Promise<PackRegistryRow | null> {
    const result = await safeQuery(
      `SELECT * FROM public.pack_registry WHERE code = $1 AND is_active = true ORDER BY version DESC LIMIT 1`,
      [code]
    );
    return result.rows[0] ?? null;
  }

  async getArtifacts(packId: string): Promise<PackArtifactRow[]> {
    const result = await safeQuery(
      `SELECT * FROM public.pack_artifacts WHERE pack_id = $1 ORDER BY artifact_type ASC`,
      [packId]
    );
    return result.rows;
  }

  async getArtifact(packId: string, artifactType: string): Promise<PackArtifactRow | null> {
    const result = await safeQuery(
      `SELECT * FROM public.pack_artifacts WHERE pack_id = $1 AND artifact_type = $2`,
      [packId, artifactType]
    );
    return result.rows[0] ?? null;
  }

  async getInstalledPacks(tenantId: string) {
    const result = await safeQuery(
      `SELECT * FROM public.tenant_pack_installations WHERE tenant_id = $1 ORDER BY installed_at ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async checkForUpdates(tenantId: string) {
    const result = await safeQuery(
      `SELECT tpi.pack_code, tpi.pack_version, tpi.pack_hash,
              pr.version AS latest_version, pr.hash AS latest_hash
       FROM public.tenant_pack_installations tpi
       JOIN public.pack_registry pr ON pr.code = tpi.pack_code AND pr.is_active = true
       WHERE tpi.tenant_id = $1 AND tpi.pack_hash != pr.hash
       ORDER BY pr.pack_layer ASC`,
      [tenantId]
    );
    return result.rows;
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async discoverPackDirs(baseDir: string): Promise<string[]> {
    const dirs: string[] = [];
    await this.walkForManifests(baseDir, dirs);
    return dirs;
  }

  private async walkForManifests(dir: string, results: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // Check if this directory has a manifest.json
    const hasManifest = entries.some(e => e.isFile() && e.name === 'manifest.json');
    if (hasManifest) {
      results.push(dir);
      return; // Don't recurse into pack directories
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        await this.walkForManifests(path.join(dir, entry.name), results);
      }
    }
  }

  private async computePackHash(packDir: string, manifest: PackManifest): Promise<string> {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(manifest));

    // Hash all artifact files
    for (const [, filename] of Object.entries(manifest.artifacts ?? {})) {
      try {
        const content = await readFile(path.join(packDir, filename), 'utf-8');
        hash.update(content);
      } catch {
        // Artifact file missing — will be caught during sync
      }
    }

    return hash.digest('hex').substring(0, 16);
  }

  private async syncArtifacts(packId: string, packDir: string, manifest: PackManifest): Promise<void> {
    // Remove existing artifacts for this pack
    await safeQuery(`DELETE FROM public.pack_artifacts WHERE pack_id = $1`, [packId]);

    for (const [artifactType, filename] of Object.entries(manifest.artifacts ?? {})) {
      try {
        const filePath = path.join(packDir, filename);
        const content = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const itemCount = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
        const checksum = createHash('sha256').update(content).digest('hex').substring(0, 16);

        await safeQuery(
          `INSERT INTO public.pack_artifacts (pack_id, artifact_type, content_json, item_count, checksum)
           VALUES ($1, $2, $3::jsonb, $4, $5)
           ON CONFLICT (pack_id, artifact_type) DO UPDATE SET
             content_json = EXCLUDED.content_json, item_count = EXCLUDED.item_count,
             checksum = EXCLUDED.checksum, created_at = NOW()`,
          [packId, artifactType, content, itemCount, checksum]
        );
      } catch (err: unknown) {
        logger.warn(`[PackRegistry] Artifact sync failed: ${packId}/${artifactType}: ${(err instanceof Error ? err.message : String(err))}`);
      }
    }
  }
}
