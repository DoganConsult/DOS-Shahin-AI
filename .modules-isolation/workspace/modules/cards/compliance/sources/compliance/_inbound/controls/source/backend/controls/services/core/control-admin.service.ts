// ============================================
// AGRC-OS — Control Admin Service
// Tenant-level control settings, taxonomy
// (categories/families), and test templates.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ControlAdminSettings {
  auto_close_deficiencies: boolean;
  default_test_frequency: string;
  require_evidence_for_closure: boolean;
  effectiveness_threshold: number;
  certification_reminder_days: number;
  sox_mode_enabled: boolean;
}

export interface ControlCategory {
  id: string;
  code: string;
  name_en: string;
  parent_category_id: string | null;
  children: ControlCategory[];
}

export interface ControlTaxonomy {
  categories: ControlCategory[];
  objectives: ControlObjective[];
}

export interface ControlObjective {
  id: string;
  code: string;
  title_en: string;
  category_id: string;
}

export interface CreateFamilyData {
  code: string;
  name_en: string;
  parent_category_id?: string;
}

export interface UpdateFamilyData {
  name_en?: string;
  parent_category_id?: string | null;
}

export interface TestTemplate {
  id: string;
  name: string;
  description: string | null;
  control_type: string | null;
  test_steps: string;
  expected_evidence: string | null;
  created_at: string;
}

export interface CreateTestTemplateData {
  name: string;
  description?: string;
  control_type?: string;
  test_steps: string;
  expected_evidence?: string;
  created_by: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlAdminService {
  /**
   * Returns control module settings for the tenant.
   * Falls back to sensible defaults if no settings row exists.
   */
  async getSettings(tenantId: string): Promise<ControlAdminSettings> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT preference_value
         FROM ${schema}.tenant_preferences
        WHERE preference_key = 'control_admin_settings'
        LIMIT 1`,
      []
    );

    if (result.rows.length > 0 && result.rows[0].preference_value) {
      const stored =
        typeof result.rows[0].preference_value === "string"
          ? JSON.parse(result.rows[0].preference_value)
          : result.rows[0].preference_value;

      return {
        auto_close_deficiencies: stored.auto_close_deficiencies ?? false,
        default_test_frequency: stored.default_test_frequency ?? "quarterly",
        require_evidence_for_closure: stored.require_evidence_for_closure ?? true,
        effectiveness_threshold: stored.effectiveness_threshold ?? 70,
        certification_reminder_days: stored.certification_reminder_days ?? 7,
        sox_mode_enabled: stored.sox_mode_enabled ?? false,
      };
    }

    // Default settings
    return {
      auto_close_deficiencies: false,
      default_test_frequency: "quarterly",
      require_evidence_for_closure: true,
      effectiveness_threshold: 70,
      certification_reminder_days: 7,
      sox_mode_enabled: false,
    };
  }

  /**
   * Persists control module settings for the tenant via UPSERT
   * into tenant_preferences.
   */
  async updateSettings(
    tenantId: string,
    data: Partial<ControlAdminSettings>
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    // Merge with existing settings
    const current = await this.getSettings(tenantId);
    const merged = { ...current, ...data };

    await safeQuery(
      `INSERT INTO ${schema}.tenant_preferences (preference_key, preference_value)
       VALUES ('control_admin_settings', $1::jsonb)
       ON CONFLICT (preference_key)
       DO UPDATE SET preference_value = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(merged)]
    );
  }

  /**
   * Returns the full control taxonomy: categories (with hierarchy)
   * and objectives.
   */
  async getTaxonomy(tenantId: string): Promise<ControlTaxonomy> {
    const schema = tenantSchema(tenantId);

    const [catResult, objResult] = await Promise.all([
      safeQuery(
        `SELECT id, code, name_en, parent_category_id
           FROM ${schema}.control_categories
          ORDER BY code`,
        []
      ),
      safeQuery(
        `SELECT id, code, title_en, category_id
           FROM ${schema}.control_objectives
          ORDER BY code`,
        []
      ),
    ]);

    // Build category tree

    const flatCategories: ControlCategory[] = catResult.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      code: r.code,
      name_en: r.name_en,
      parent_category_id: r.parent_category_id,
      children: [],
    }));

    const categoryMap = new Map<string, ControlCategory>();
    for (const cat of flatCategories) {
      categoryMap.set(cat.id, cat);
    }

    // Nest children under their parents
    const rootCategories: ControlCategory[] = [];
    for (const cat of flatCategories) {
      if (cat.parent_category_id && categoryMap.has(cat.parent_category_id)) {
        categoryMap.get(cat.parent_category_id)!.children.push(cat);
      } else {
        rootCategories.push(cat);
      }
    }

    const objectives: ControlObjective[] = objResult.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      code: r.code,
      title_en: r.title_en,
      category_id: r.category_id,
    }));

    return {
      categories: rootCategories,
      objectives,
    };
  }

  /**
   * Creates a new control category (family) in the taxonomy.
   */
  async createFamily(
    tenantId: string,
    data: CreateFamilyData
  ): Promise<{ id: string }> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `INSERT INTO ${schema}.control_categories (code, name_en, parent_category_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [data.code, data.name_en, data.parent_category_id ?? null]
    );

    return { id: result.rows[0].id };
  }

  /**
   * Updates an existing control category (family).
   * Only provided fields are changed.
   */
  async updateFamily(
    tenantId: string,
    familyId: string,
    data: UpdateFamilyData
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (data.name_en !== undefined) {
      setClauses.push(`name_en = $${paramIdx}`);
      params.push(data.name_en);
      paramIdx++;
    }

    if (data.parent_category_id !== undefined) {
      setClauses.push(`parent_category_id = $${paramIdx}`);
      params.push(data.parent_category_id);
      paramIdx++;
    }

    if (setClauses.length === 0) {
      return; // Nothing to update
    }

    params.push(familyId);

    await safeQuery(
      `UPDATE ${schema}.control_categories
          SET ${setClauses.join(", ")}
        WHERE id = $${paramIdx}`,
      params
    );
  }

  /**
   * Lists all test templates available for the tenant.
   */
  async getTestTemplates(tenantId: string): Promise<TestTemplate[]> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT id, name, description, control_type, test_steps,
              expected_evidence, created_at
         FROM ${schema}.control_test_templates
        ORDER BY name`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      control_type: r.control_type,
      test_steps: r.test_steps,
      expected_evidence: r.expected_evidence,
      created_at: r.created_at,
    }));
  }

  /**
   * Creates a new test template.
   */
  async createTestTemplate(
    tenantId: string,
    data: CreateTestTemplateData
  ): Promise<{ id: string }> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `INSERT INTO ${schema}.control_test_templates
         (name, description, control_type, test_steps, expected_evidence, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.name,
        data.description ?? null,
        data.control_type ?? null,
        data.test_steps,
        data.expected_evidence ?? null,
        data.created_by,
      ]
    );

    return { id: result.rows[0].id };
  }
}
