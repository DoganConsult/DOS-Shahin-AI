-- P7 — Idempotent realistic seed for the primary active tenant (douhan_consult).
--
-- Populates dos.* foundation tables so Foundation pages render non-empty lists
-- on first login. Safe to re-run; every INSERT is guarded by ON CONFLICT or
-- NOT EXISTS. Runs in Phase 2b of ops/scripts/run-migrations.sh.
--
-- Only seeds tenants whose status = 'active' to avoid polluting registered/test
-- accounts that will be cleaned up. Extend by adding to the SEED_TENANTS CTE.

BEGIN;

DO $seed$
DECLARE
  t RECORD;
  v_org_id uuid;
  v_bu_id uuid;
  v_bu_fin_id uuid;
  v_bu_tech_id uuid;
  v_loc_hq_id uuid;
  v_loc_riyadh_id uuid;
  v_committee_audit_id uuid;
  v_committee_risk_id uuid;
  v_ceo_pos_id uuid;
  v_creator text := 'system-seed';
BEGIN
  FOR t IN
    SELECT tenant_id::text AS tenant_id, tenant_code, org_name
      FROM public.tenants
     WHERE status = 'active'
  LOOP
    RAISE NOTICE '[foundation-seed] tenant=% org=%', t.tenant_id, t.org_name;

    -- 1. Organization ------------------------------------------------
    SELECT organization_id INTO v_org_id
      FROM dos.organizations
     WHERE tenant_id = t.tenant_id AND deleted_at IS NULL
     ORDER BY created_at ASC LIMIT 1;

    IF v_org_id IS NULL THEN
      INSERT INTO dos.organizations
        (organization_id, tenant_id, name_en, name_ar, code, org_type, status, description, created_by, created_at, updated_at)
      VALUES
        (gen_random_uuid(), t.tenant_id, COALESCE(t.org_name,'Default Organization'),
         'المؤسسة الافتراضية', 'ORG-HQ', 'holding', 'active',
         'Primary organization seeded by foundation demo seed.',
         v_creator, NOW(), NOW())
      RETURNING organization_id INTO v_org_id;
    END IF;

    -- 2. Business Units ----------------------------------------------
    SELECT bu_id INTO v_bu_id FROM dos.business_units
     WHERE tenant_id = t.tenant_id AND code = 'HQ' AND deleted_at IS NULL LIMIT 1;
    IF v_bu_id IS NULL THEN
      INSERT INTO dos.business_units
        (bu_id, tenant_id, organization_id, name_en, name_ar, code, bu_type, status, description, created_by, created_at, updated_at)
      VALUES
        (gen_random_uuid(), t.tenant_id, v_org_id, 'Headquarters', 'المقر الرئيسي', 'HQ', 'corporate', 'active',
         'Corporate headquarters', v_creator, NOW(), NOW())
      RETURNING bu_id INTO v_bu_id;
    END IF;

    SELECT bu_id INTO v_bu_fin_id FROM dos.business_units
     WHERE tenant_id = t.tenant_id AND code = 'FIN' AND deleted_at IS NULL LIMIT 1;
    IF v_bu_fin_id IS NULL THEN
      INSERT INTO dos.business_units
        (bu_id, tenant_id, organization_id, parent_bu_id, name_en, name_ar, code, bu_type, status, created_by, created_at, updated_at)
      VALUES
        (gen_random_uuid(), t.tenant_id, v_org_id, v_bu_id, 'Finance', 'الشؤون المالية', 'FIN', 'function', 'active',
         v_creator, NOW(), NOW())
      RETURNING bu_id INTO v_bu_fin_id;
    END IF;

    SELECT bu_id INTO v_bu_tech_id FROM dos.business_units
     WHERE tenant_id = t.tenant_id AND code = 'TECH' AND deleted_at IS NULL LIMIT 1;
    IF v_bu_tech_id IS NULL THEN
      INSERT INTO dos.business_units
        (bu_id, tenant_id, organization_id, parent_bu_id, name_en, name_ar, code, bu_type, status, created_by, created_at, updated_at)
      VALUES
        (gen_random_uuid(), t.tenant_id, v_org_id, v_bu_id, 'Technology', 'التقنية', 'TECH', 'function', 'active',
         v_creator, NOW(), NOW());
    END IF;

    -- 3. Positions ---------------------------------------------------
    INSERT INTO dos.positions (position_id, tenant_id, bu_id, title_en, title_ar, code, grade, level, status, created_by, created_at, updated_at)
    SELECT gen_random_uuid(), t.tenant_id, v_bu_id, x.title_en, x.title_ar, x.code, x.grade, x.level, 'active', v_creator, NOW(), NOW()
      FROM (VALUES
        ('Chief Executive Officer',  'الرئيس التنفيذي',  'CEO', 'E1', 1),
        ('Chief Financial Officer',  'المدير المالي',     'CFO', 'E2', 2),
        ('Chief Technology Officer', 'مدير التقنية',      'CTO', 'E2', 2),
        ('Chief Operating Officer',  'مدير العمليات',     'COO', 'E2', 2),
        ('Chief Compliance Officer', 'مدير الالتزام',     'CCO', 'E2', 2),
        ('Chief Risk Officer',       'مدير المخاطر',      'CRO', 'E2', 2)
      ) AS x(title_en, title_ar, code, grade, level)
     WHERE NOT EXISTS (
       SELECT 1 FROM dos.positions p
        WHERE p.tenant_id = t.tenant_id AND p.code = x.code AND p.deleted_at IS NULL
     );

    -- 4. Locations ---------------------------------------------------
    SELECT location_id INTO v_loc_riyadh_id FROM dos.locations
     WHERE tenant_id = t.tenant_id AND code = 'RUH-HQ' AND deleted_at IS NULL LIMIT 1;
    IF v_loc_riyadh_id IS NULL THEN
      INSERT INTO dos.locations
        (location_id, tenant_id, name_en, name_ar, code, location_type, country, city, address, status, created_by, created_at, updated_at)
      VALUES
        (gen_random_uuid(), t.tenant_id, 'Riyadh Headquarters', 'المقر الرئيسي بالرياض', 'RUH-HQ',
         'office', 'SA', 'Riyadh', 'King Fahd Road, Riyadh 12345', 'active', v_creator, NOW(), NOW());
    END IF;

    INSERT INTO dos.locations
      (location_id, tenant_id, name_en, name_ar, code, location_type, country, city, address, status, created_by, created_at, updated_at)
    SELECT gen_random_uuid(), t.tenant_id, x.en, x.ar, x.code, 'office', 'SA', x.city, x.addr, 'active', v_creator, NOW(), NOW()
      FROM (VALUES
        ('Jeddah Branch',  'فرع جدة',    'JED-01', 'Jeddah',    'Corniche Road, Jeddah'),
        ('Dammam Office',  'مكتب الدمام', 'DMM-01', 'Dammam',   'King Saud St, Dammam')
      ) AS x(en, ar, code, city, addr)
     WHERE NOT EXISTS (
       SELECT 1 FROM dos.locations l
        WHERE l.tenant_id = t.tenant_id AND l.code = x.code AND l.deleted_at IS NULL
     );

    -- 5. Committees --------------------------------------------------
    INSERT INTO dos.committees
      (committee_id, tenant_id, name_en, name_ar, code, committee_type, charter, status, created_at, updated_at)
    SELECT gen_random_uuid(), t.tenant_id, x.en, x.ar, x.code, x.ctype, x.charter, 'active', NOW(), NOW()
      FROM (VALUES
        ('Audit Committee',       'لجنة التدقيق',       'COM-AUD', 'audit',      'Oversees internal audit, external audit coordination, and financial reporting integrity.'),
        ('Risk Committee',        'لجنة المخاطر',       'COM-RISK','risk',       'Reviews enterprise risk posture, risk appetite, and mitigation effectiveness.'),
        ('Compliance Committee',  'لجنة الالتزام',      'COM-COMP','compliance', 'Ensures regulatory compliance across SAMA, ECC, PDPL, and sector-specific mandates.')
      ) AS x(en, ar, code, ctype, charter)
     WHERE NOT EXISTS (
       SELECT 1 FROM dos.committees c
        WHERE c.tenant_id = t.tenant_id AND c.code = x.code AND c.deleted_at IS NULL
     );

    -- 6. Audit trail seed --------------------------------------------
    INSERT INTO dos.audit_trail
      (entry_id, tenant_id, actor_id, action, entity_type, entity_id, module, payload, created_at)
    SELECT gen_random_uuid(), t.tenant_id, v_creator, 'foundation.seed.applied',
           'tenant', t.tenant_id, 'foundation',
           jsonb_build_object('source','demo-seed','ts', to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
           NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM dos.audit_trail a
        WHERE a.tenant_id = t.tenant_id AND a.action = 'foundation.seed.applied'
     );
  END LOOP;
END
$seed$;

COMMIT;
