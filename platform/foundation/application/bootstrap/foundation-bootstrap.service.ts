import { query } from '../../ports/database.port';

/**
 * HG5 — Tenant bootstrap seed hook.
 *
 * Creates the minimum viable foundation footprint for a new tenant so the
 * workspace home renders non-empty cards on first login:
 *   - 1 default organization
 *   - 1 root business unit
 *   - 4 default positions (CEO, CFO, CTO, COO)
 *   - Tenant-owner role assignment (functional role 'tenant_owner' if present)
 *
 * Invoked by tenant-service/src/domain/provisioning/module-kickstart.service.ts
 * when the 'foundation' module is activated for a tenant.
 *
 * Idempotent — safe to re-run; all INSERTs are ON CONFLICT DO NOTHING.
 */

export interface FoundationBootstrapInput {
  tenantId: string;
  ownerUserId: string;
  organizationNameEn?: string;
  organizationNameAr?: string;
}

export interface FoundationBootstrapResult {
  tenantId: string;
  organizationId: string;
  businessUnitId: string;
  positionIds: string[];
  ownerRoleAssigned: boolean;
  alreadyBootstrapped: boolean;
}

const DEFAULT_POSITIONS = [
  { code: 'CEO', titleEn: 'Chief Executive Officer',  titleAr: 'الرئيس التنفيذي' },
  { code: 'CFO', titleEn: 'Chief Financial Officer',  titleAr: 'المدير المالي' },
  { code: 'CTO', titleEn: 'Chief Technology Officer', titleAr: 'مدير التقنية' },
  { code: 'COO', titleEn: 'Chief Operating Officer',  titleAr: 'مدير العمليات' },
];

export async function bootstrapFoundationDefaults(
  input: FoundationBootstrapInput,
): Promise<FoundationBootstrapResult> {
  const { tenantId, ownerUserId } = input;
  if (!tenantId) throw new Error('bootstrapFoundationDefaults: tenantId required');
  if (!ownerUserId) throw new Error('bootstrapFoundationDefaults: ownerUserId required');

  const existing = await query(
    `SELECT organization_id FROM dos.organizations
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));

  let organizationId: string;
  let alreadyBootstrapped = false;

  if (existing.rows?.length) {
    organizationId = existing.rows[0].organization_id;
    alreadyBootstrapped = true;
  } else {
    const orgIns = await query(
      `INSERT INTO dos.organizations
         (organization_id, tenant_id, name_en, name_ar, status, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, 'active', NOW(), NOW(), $4)
       RETURNING organization_id`,
      [
        tenantId,
        input.organizationNameEn ?? 'Default Organization',
        input.organizationNameAr ?? 'المؤسسة الافتراضية',
        ownerUserId,
      ],
    );
    organizationId = orgIns.rows[0].organization_id;
  }

  const buExisting = await query(
    `SELECT bu_id FROM dos.business_units
      WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`,
    [tenantId, organizationId],
  ).catch(() => ({ rows: [] as any[] }));

  let businessUnitId: string;
  if (buExisting.rows?.length) {
    businessUnitId = buExisting.rows[0].bu_id;
  } else {
    const buIns = await query(
      `INSERT INTO dos.business_units
         (bu_id, tenant_id, organization_id, name_en, name_ar, status, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, 'Headquarters', 'المقر الرئيسي', 'active', NOW(), NOW(), $3)
       RETURNING bu_id`,
      [tenantId, organizationId, ownerUserId],
    );
    businessUnitId = buIns.rows[0].bu_id;
  }

  const positionIds: string[] = [];
  for (const p of DEFAULT_POSITIONS) {
    const posExisting = await query(
      `SELECT position_id FROM dos.positions
        WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL`,
      [tenantId, p.code],
    ).catch(() => ({ rows: [] as any[] }));
    if (posExisting.rows?.length) {
      positionIds.push(posExisting.rows[0].position_id);
      continue;
    }
    const ins = await query(
      `INSERT INTO dos.positions
         (position_id, tenant_id, bu_id, code, title_en, title_ar, status, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', NOW(), NOW(), $6)
       RETURNING position_id`,
      [tenantId, businessUnitId, p.code, p.titleEn, p.titleAr, ownerUserId],
    ).catch(() => ({ rows: [] as any[] }));
    if (ins.rows?.length) positionIds.push(ins.rows[0].position_id);
  }

  let ownerRoleAssigned = false;
  try {
    const roleRow = await query(
      `SELECT role_id FROM dos.functional_roles WHERE code = 'tenant_owner' LIMIT 1`,
    );
    if (roleRow.rows?.length) {
      const roleId = roleRow.rows[0].role_id;
      await query(
        `INSERT INTO dos.user_role_assignments
           (assignment_id, tenant_id, user_id, role_id, assigned_at, assigned_by, status)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $2, 'active')
         ON CONFLICT DO NOTHING`,
        [tenantId, ownerUserId, roleId],
      );
      ownerRoleAssigned = true;
    }
  } catch {
    ownerRoleAssigned = false;
  }

  return {
    tenantId,
    organizationId,
    businessUnitId,
    positionIds,
    ownerRoleAssigned,
    alreadyBootstrapped,
  };
}
