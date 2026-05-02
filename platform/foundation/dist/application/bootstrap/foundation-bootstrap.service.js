"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapFoundationDefaults = bootstrapFoundationDefaults;
const database_port_1 = require("../../ports/database.port");
const DEFAULT_POSITIONS = [
    { code: 'CEO', titleEn: 'Chief Executive Officer', titleAr: 'الرئيس التنفيذي' },
    { code: 'CFO', titleEn: 'Chief Financial Officer', titleAr: 'المدير المالي' },
    { code: 'CTO', titleEn: 'Chief Technology Officer', titleAr: 'مدير التقنية' },
    { code: 'COO', titleEn: 'Chief Operating Officer', titleAr: 'مدير العمليات' },
];
async function bootstrapFoundationDefaults(input) {
    const { tenantId, ownerUserId } = input;
    if (!tenantId)
        throw new Error('bootstrapFoundationDefaults: tenantId required');
    if (!ownerUserId)
        throw new Error('bootstrapFoundationDefaults: ownerUserId required');
    const existing = await (0, database_port_1.query)(`SELECT organization_id FROM dos.organizations
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`, [tenantId]).catch(() => ({ rows: [] }));
    let organizationId;
    let alreadyBootstrapped = false;
    if (existing.rows?.length) {
        organizationId = existing.rows[0].organization_id;
        alreadyBootstrapped = true;
    }
    else {
        const orgIns = await (0, database_port_1.query)(`INSERT INTO dos.organizations
         (organization_id, tenant_id, name_en, name_ar, status, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, 'active', NOW(), NOW(), $4)
       RETURNING organization_id`, [
            tenantId,
            input.organizationNameEn ?? 'Default Organization',
            input.organizationNameAr ?? 'المؤسسة الافتراضية',
            ownerUserId,
        ]);
        organizationId = orgIns.rows[0].organization_id;
    }
    const buExisting = await (0, database_port_1.query)(`SELECT bu_id FROM dos.business_units
      WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`, [tenantId, organizationId]).catch(() => ({ rows: [] }));
    let businessUnitId;
    if (buExisting.rows?.length) {
        businessUnitId = buExisting.rows[0].bu_id;
    }
    else {
        const buIns = await (0, database_port_1.query)(`INSERT INTO dos.business_units
         (bu_id, tenant_id, organization_id, name_en, name_ar, status, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, 'Headquarters', 'المقر الرئيسي', 'active', NOW(), NOW(), $3)
       RETURNING bu_id`, [tenantId, organizationId, ownerUserId]);
        businessUnitId = buIns.rows[0].bu_id;
    }
    const positionIds = [];
    for (const p of DEFAULT_POSITIONS) {
        const posExisting = await (0, database_port_1.query)(`SELECT position_id FROM dos.positions
        WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL`, [tenantId, p.code]).catch(() => ({ rows: [] }));
        if (posExisting.rows?.length) {
            positionIds.push(posExisting.rows[0].position_id);
            continue;
        }
        const ins = await (0, database_port_1.query)(`INSERT INTO dos.positions
         (position_id, tenant_id, bu_id, code, title_en, title_ar, status, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', NOW(), NOW(), $6)
       RETURNING position_id`, [tenantId, businessUnitId, p.code, p.titleEn, p.titleAr, ownerUserId]).catch(() => ({ rows: [] }));
        if (ins.rows?.length)
            positionIds.push(ins.rows[0].position_id);
    }
    let ownerRoleAssigned = false;
    try {
        const roleRow = await (0, database_port_1.query)(`SELECT role_id FROM dos.functional_roles WHERE code = 'tenant_owner' LIMIT 1`);
        if (roleRow.rows?.length) {
            const roleId = roleRow.rows[0].role_id;
            await (0, database_port_1.query)(`INSERT INTO dos.user_role_assignments
           (assignment_id, tenant_id, user_id, role_id, assigned_at, assigned_by, status)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $2, 'active')
         ON CONFLICT DO NOTHING`, [tenantId, ownerUserId, roleId]);
            ownerRoleAssigned = true;
        }
    }
    catch {
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
//# sourceMappingURL=foundation-bootstrap.service.js.map