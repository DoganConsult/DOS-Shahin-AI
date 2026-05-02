import type { AssetRow, CreateAssetInput, ListQuery, PatchAssetInput } from './assets.types';

export interface UploadAttachInput {
  storage_key: string;
  mime_type: string;
  file_size_bytes: number;
  content_sha256: string;
  original_filename: string;
  storage_driver: string;
}

export interface AssetsRepo {
  create(input: CreateAssetInput, actor: { user?: string; tenant?: string }): Promise<AssetRow>;
  getById(id: string): Promise<AssetRow | null>;
  getBySlug(slug: string): Promise<AssetRow | null>;
  findByContentHash(sha256: string): Promise<AssetRow | null>;
  list(q: ListQuery): Promise<{ data: AssetRow[]; total: number }>;
  patch(id: string, p: PatchAssetInput, actor: { user?: string }): Promise<AssetRow | null>;
  attachUpload(id: string, u: UploadAttachInput, actor: { user?: string }): Promise<AssetRow | null>;
  softDelete(id: string, actor: { user?: string }): Promise<AssetRow | null>;
}

// =====================================================================
// Postgres implementation — raw SQL via @dos/db.
// Tables (public.sales_room_assets) are created by module migration
// 20260430_2000. See modules/sales-room/db/migrations/.
// =====================================================================

interface QueryFn {
  <T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount?: number }>;
}

export class PgAssetsRepo implements AssetsRepo {
  constructor(private readonly q: QueryFn) {}

  async create(input: CreateAssetInput, actor: { user?: string; tenant?: string }): Promise<AssetRow> {
    const sql = `
      INSERT INTO public.sales_room_assets (
        slug, title_en, title_ar, description_en, description_ar,
        asset_type, product_code, language, audience, tags,
        is_public, is_active, allow_preview, allow_download,
        require_lead_capture, watermark_required, sort_order,
        created_by_tenant, created_by_user, ingestion_status, storage_key, storage_driver, mime_type
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, 'pending', NULL, 'fs', NULL
      )
      RETURNING *`;
    const { rows } = await this.q<AssetRow>(sql, [
      input.slug, input.title_en, input.title_ar ?? null, input.description_en ?? null, input.description_ar ?? null,
      input.asset_type, input.product_code ?? null, input.language, input.audience, input.tags,
      input.is_public, input.is_active, input.allow_preview, input.allow_download,
      input.require_lead_capture, input.watermark_required, input.sort_order,
      actor.tenant ?? null, actor.user ?? null,
    ]);
    return rows[0];
  }

  async getById(id: string): Promise<AssetRow | null> {
    const { rows } = await this.q<AssetRow>(
      `SELECT * FROM public.sales_room_assets WHERE asset_id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  async getBySlug(slug: string): Promise<AssetRow | null> {
    const { rows } = await this.q<AssetRow>(
      `SELECT * FROM public.sales_room_assets WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    return rows[0] ?? null;
  }

  async findByContentHash(sha256: string): Promise<AssetRow | null> {
    const { rows } = await this.q<AssetRow>(
      `SELECT * FROM public.sales_room_assets
       WHERE content_sha256 = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
      [sha256],
    );
    return rows[0] ?? null;
  }

  async list(q: ListQuery): Promise<{ data: AssetRow[]; total: number }> {
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    const push = (clause: string, val: unknown) => {
      params.push(val);
      where.push(clause.replace('?', `$${params.length}`));
    };
    if (q.asset_type)   push('asset_type = ?',     q.asset_type);
    if (q.audience)     push('audience = ?',       q.audience);
    if (q.language)     push('language = ?',       q.language);
    if (q.product_code) push('product_code = ?',   q.product_code);
    if (q.is_public !== undefined) push('is_public = ?', q.is_public);
    if (q.is_active !== undefined) push('is_active = ?', q.is_active);
    if (q.search) {
      const needle = `%${q.search}%`;
      params.push(needle);
      const i = params.length;
      where.push(`(title_en ILIKE $${i} OR title_ar ILIKE $${i} OR description_en ILIKE $${i})`);
    }

    const sortCol = ({ created_at: 'created_at', sort_order: 'sort_order', title_en: 'title_en' } as const)[q.sort];
    const orderDir = q.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (q.page - 1) * q.pageSize;

    const dataSql = `
      SELECT * FROM public.sales_room_assets
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortCol} ${orderDir}
      LIMIT ${q.pageSize} OFFSET ${offset}`;
    const totalSql = `SELECT COUNT(*)::int AS n FROM public.sales_room_assets WHERE ${where.join(' AND ')}`;

    const [data, total] = await Promise.all([
      this.q<AssetRow>(dataSql, params),
      this.q<{ n: number }>(totalSql, params),
    ]);
    return { data: data.rows, total: total.rows[0]?.n ?? 0 };
  }

  async patch(id: string, p: PatchAssetInput, actor: { user?: string }): Promise<AssetRow | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => {
      params.push(val);
      setClauses.push(`${col} = $${params.length}`);
    };
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      push(k, v);
    }
    if (setClauses.length === 0) return this.getById(id);
    push('updated_at', new Date().toISOString());
    void actor;
    params.push(id);
    const sql = `UPDATE public.sales_room_assets SET ${setClauses.join(', ')}
                 WHERE asset_id = $${params.length} AND deleted_at IS NULL RETURNING *`;
    const { rows } = await this.q<AssetRow>(sql, params);
    return rows[0] ?? null;
  }

  async attachUpload(id: string, u: UploadAttachInput, actor: { user?: string }): Promise<AssetRow | null> {
    void actor;
    const sql = `
      UPDATE public.sales_room_assets SET
        storage_driver = $1,
        storage_key = $2,
        mime_type = $3,
        file_size_bytes = $4,
        content_sha256 = $5,
        original_filename = $6,
        ingestion_status = 'ready',
        ingestion_finished_at = NOW(),
        updated_at = NOW()
      WHERE asset_id = $7 AND deleted_at IS NULL
      RETURNING *`;
    const { rows } = await this.q<AssetRow>(sql, [
      u.storage_driver, u.storage_key, u.mime_type, u.file_size_bytes,
      u.content_sha256, u.original_filename, id,
    ]);
    return rows[0] ?? null;
  }

  async softDelete(id: string, actor: { user?: string }): Promise<AssetRow | null> {
    void actor;
    const sql = `UPDATE public.sales_room_assets
                 SET deleted_at = NOW(), is_active = FALSE, is_public = FALSE, updated_at = NOW()
                 WHERE asset_id = $1 AND deleted_at IS NULL
                 RETURNING *`;
    const { rows } = await this.q<AssetRow>(sql, [id]);
    return rows[0] ?? null;
  }
}

// =====================================================================
// In-memory repo — used in unit/smoke tests so the storage + signing +
// upload pipeline can be exercised without DB tables. NOT production.
// =====================================================================

import { randomUUID } from 'node:crypto';

export class InMemoryAssetsRepo implements AssetsRepo {
  private rows: AssetRow[] = [];

  async create(input: CreateAssetInput, actor: { user?: string; tenant?: string }): Promise<AssetRow> {
    const now = new Date().toISOString();
    const row: AssetRow = {
      asset_id: randomUUID(),
      slug: input.slug,
      title_en: input.title_en,
      title_ar: input.title_ar ?? null,
      description_en: input.description_en ?? null,
      description_ar: input.description_ar ?? null,
      asset_type: input.asset_type,
      product_code: input.product_code ?? null,
      language: input.language,
      audience: input.audience,
      tags: input.tags,
      storage_driver: 'fs',
      storage_key: null,
      mime_type: null,
      file_size_bytes: null,
      content_sha256: null,
      original_filename: null,
      is_public: input.is_public,
      is_active: input.is_active,
      allow_preview: input.allow_preview,
      allow_download: input.allow_download,
      require_lead_capture: input.require_lead_capture,
      watermark_required: input.watermark_required,
      ingestion_status: 'pending',
      ingestion_error: null,
      ingestion_started_at: null,
      ingestion_finished_at: null,
      created_by_tenant: actor.tenant ?? null,
      created_by_user: actor.user ?? null,
      sort_order: input.sort_order,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    if (this.rows.some(r => r.slug === row.slug && r.deleted_at === null)) {
      const e = new Error('slug already exists') as Error & { code?: string };
      e.code = 'unique_violation_slug';
      throw e;
    }
    this.rows.push(row);
    return { ...row };
  }
  async getById(id: string) { return this.rows.find(r => r.asset_id === id && !r.deleted_at) ?? null; }
  async getBySlug(slug: string) { return this.rows.find(r => r.slug === slug && !r.deleted_at) ?? null; }
  async findByContentHash(sha: string) {
    return this.rows.find(r => r.content_sha256 === sha && !r.deleted_at) ?? null;
  }
  async list(q: ListQuery) {
    let rs = this.rows.filter(r => !r.deleted_at);
    if (q.asset_type)   rs = rs.filter(r => r.asset_type === q.asset_type);
    if (q.audience)     rs = rs.filter(r => r.audience === q.audience);
    if (q.language)     rs = rs.filter(r => r.language === q.language);
    if (q.product_code) rs = rs.filter(r => r.product_code === q.product_code);
    if (q.is_public !== undefined) rs = rs.filter(r => r.is_public === q.is_public);
    if (q.is_active !== undefined) rs = rs.filter(r => r.is_active === q.is_active);
    if (q.search) {
      const s = q.search.toLowerCase();
      rs = rs.filter(r => r.title_en.toLowerCase().includes(s) ||
        (r.title_ar || '').toLowerCase().includes(s) ||
        (r.description_en || '').toLowerCase().includes(s));
    }
    rs.sort((a, b) => {
      const av = (a as any)[q.sort], bv = (b as any)[q.sort];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return q.order === 'asc' ? cmp : -cmp;
    });
    const total = rs.length;
    const start = (q.page - 1) * q.pageSize;
    return { data: rs.slice(start, start + q.pageSize), total };
  }
  async patch(id: string, p: PatchAssetInput) {
    const i = this.rows.findIndex(r => r.asset_id === id && !r.deleted_at);
    if (i < 0) return null;
    this.rows[i] = { ...this.rows[i], ...p, updated_at: new Date().toISOString() } as AssetRow;
    return { ...this.rows[i] };
  }
  async attachUpload(id: string, u: UploadAttachInput) {
    const i = this.rows.findIndex(r => r.asset_id === id && !r.deleted_at);
    if (i < 0) return null;
    this.rows[i] = {
      ...this.rows[i],
      storage_driver: u.storage_driver,
      storage_key: u.storage_key,
      mime_type: u.mime_type,
      file_size_bytes: u.file_size_bytes,
      content_sha256: u.content_sha256,
      original_filename: u.original_filename,
      ingestion_status: 'ready',
      ingestion_finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { ...this.rows[i] };
  }
  async softDelete(id: string) {
    const i = this.rows.findIndex(r => r.asset_id === id && !r.deleted_at);
    if (i < 0) return null;
    this.rows[i] = {
      ...this.rows[i],
      deleted_at: new Date().toISOString(),
      is_active: false,
      is_public: false,
      updated_at: new Date().toISOString(),
    };
    return { ...this.rows[i] };
  }
}
