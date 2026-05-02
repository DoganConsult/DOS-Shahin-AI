import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc';
let pool: pg.Pool;

const TEST_PREFIX = 'e2e_test_';
const TEST_EMAIL = `${TEST_PREFIX}${Date.now()}@test.shahin.ai`;
const TEST_ORG = `E2E Test Org ${Date.now()}`;
const TEST_USER_NAME = 'E2E Test User';

let tenantId: string;
let userId: string;
let sessionId: string;
let schemaName: string;

async function q(sql: string, params?: unknown[]) {
  return pool.query(sql, params);
}

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: DB_URL, max: 5 });
  await q('SELECT 1');
});

afterAll(async () => {
  if (tenantId) {
    try {
      if (schemaName) await q(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await q(`DELETE FROM public.provisioning_steps WHERE job_id IN (SELECT id FROM public.provisioning_jobs WHERE tenant_id = $1::text)`, [tenantId]);
      await q(`DELETE FROM public.provisioning_jobs WHERE tenant_id = $1::text`, [tenantId]);
      await q(`DELETE FROM public.onboarding_answers WHERE session_id = $1`, [sessionId]);
      await q(`DELETE FROM public.onboarding_sessions WHERE tenant_id = $1`, [tenantId]);
      await q(`DELETE FROM public.tenant_user_memberships WHERE tenant_id = $1`, [tenantId]);
      await q(`DELETE FROM public.users WHERE tenant_id = $1`, [tenantId]);
      await q(`DELETE FROM public.tenants WHERE tenant_id = $1`, [tenantId]);
    } catch (e) { console.warn('Cleanup warning:', (e as Error).message); }
  }
  await pool.end();
});

describe('Onboarding E2E Runtime — Full Flow', () => {

  // ═══════════════════════════════════════════
  // STAGE 1: REGISTRATION
  // ═══════════════════════════════════════════
  describe('Stage 1: Registration', () => {
    it('creates tenant, user, membership, and onboarding session in DB', async () => {
      const bcrypt = await import('bcryptjs');
      const { v4: uuid } = await import('uuid');

      userId = uuid();
      tenantId = uuid().replace(/-/g, '').slice(0, 12);
      const tenantCode = 'e2e-test-' + tenantId.slice(0, 4);
      schemaName = 'tenant_' + tenantId.replace(/-/g, '_');
      const passwordHash = await bcrypt.hash('TestP@ss123!', 12);
      const registrationId = uuid();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO public.tenants (tenant_id, org_name, tenant_code, tenant_name_en, schema_name, status, plan, industry, org_size, country_of_incorporation)
           VALUES ($1, $2, $3, $4, $5, 'registered', 'free', $6, $7, $8)`,
          [tenantId, TEST_ORG, tenantCode, TEST_ORG, schemaName, 'Financial Services', '51-200', 'SA']
        );
        await client.query(
          `INSERT INTO public.users (user_id, email, password_hash, name, full_name, tenant_id, role, status, is_super_admin, onboarding_complete, platform_role)
           VALUES ($1, $2, $3, $4, $5, $6, 'owner', 'active', FALSE, FALSE, 'admin')`,
          [userId, TEST_EMAIL, passwordHash, TEST_USER_NAME, TEST_USER_NAME, tenantId]
        );
        await client.query(
          `INSERT INTO public.tenant_user_memberships (tenant_id, user_id, membership_type, is_tenant_owner, status)
           VALUES ($1, $2, 'internal', TRUE, 'active')`,
          [tenantId, userId]
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      const sessionResult = await q(
        `INSERT INTO public.onboarding_sessions
           (session_key, status, tenant_id, started_by_user_id, organization_name, language_code, product_key, package_version)
         VALUES ($1, 'draft', $2, $3, $4, 'en', 'shahin', 'v1')
         RETURNING id`,
        [registrationId, tenantId, userId, TEST_ORG]
      );
      sessionId = sessionResult.rows[0].id;

      const tenant = await q(`SELECT * FROM public.tenants WHERE tenant_id = $1`, [tenantId]);
      expect(tenant.rows.length).toBe(1);
      expect(tenant.rows[0].org_name).toBe(TEST_ORG);
      expect(tenant.rows[0].status).toBe('registered');
      expect(tenant.rows[0].industry).toBe('Financial Services');
      expect(tenant.rows[0].country_of_incorporation).toBe('SA');

      const user = await q(`SELECT * FROM public.users WHERE user_id = $1`, [userId]);
      expect(user.rows.length).toBe(1);
      expect(user.rows[0].email).toBe(TEST_EMAIL);
      expect(user.rows[0].onboarding_complete).toBe(false);

      const membership = await q(`SELECT * FROM public.tenant_user_memberships WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId]);
      expect(membership.rows.length).toBe(1);
      expect(membership.rows[0].is_tenant_owner).toBe(true);

      const session = await q(`SELECT * FROM public.onboarding_sessions WHERE id = $1`, [sessionId]);
      expect(session.rows.length).toBe(1);
      expect(session.rows[0].status).toBe('draft');
      expect(session.rows[0].tenant_id).toBe(tenantId);
    });

    it('registration seed answers are stored', async () => {
      const seedAnswers: [string, string][] = [
        ['org.legal_name', TEST_ORG],
        ['org.industry', 'Financial Services'],
        ['org.country', 'SA'],
        ['org.org_type', 'regulated_financial'],
        ['org.employee_band', '51-200'],
      ];

      for (const [qCode, val] of seedAnswers) {
        await q(
          `INSERT INTO public.onboarding_answers (session_id, question_code, answer_text, answered_by_user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (session_id, question_code) DO UPDATE SET answer_text = EXCLUDED.answer_text, updated_at = NOW()`,
          [sessionId, qCode, val, userId]
        );
      }

      const answers = await q(`SELECT question_code, answer_text FROM public.onboarding_answers WHERE session_id = $1 ORDER BY question_code`, [sessionId]);
      expect(answers.rows.length).toBe(5);
      const map = Object.fromEntries(answers.rows.map((r: any) => [r.question_code, r.answer_text]));
      expect(map['org.legal_name']).toBe(TEST_ORG);
      expect(map['org.industry']).toBe('Financial Services');
      expect(map['org.country']).toBe('SA');
    });
  });

  // ═══════════════════════════════════════════
  // STAGE 2: ONBOARDING QUESTIONS (all 18 stages)
  // ═══════════════════════════════════════════
  describe('Stage 2: Onboarding Questions — All Stages', () => {
    const STAGE_ANSWERS: Record<string, [string, string | string][]> = {
      organization_identity: [
        ['org.display_name', TEST_ORG],
        ['org.arabic_name', 'اختبار'],
        ['org.where_hq', 'SA'],
        ['org.timezone', 'Asia/Riyadh'],
        ['org.fiscal_year_end', 'december'],
        ['org.data_residency', 'SA'],
        ['org.business_days', '["sun","mon","tue","wed","thu"]'],
        ['org.team_size', '51-200'],
        ['org.sub_sector', 'banking'],
        ['org.language', 'en'],
        ['org.registration_number', 'CR-12345'],
        ['org.website', 'https://test.example.com'],
      ],
      regulatory_scope: [
        ['reg.frameworks_confirmed', '["ISO27001","PDPL","NCA-ECC"]'],
        ['reg.known_regulator', 'SAMA'],
        ['reg.serves_government', 'true'],
        ['reg.sama_compliance', 'true'],
        ['reg.nca_registration', 'true'],
        ['reg.handles_personal_data', 'true'],
        ['reg.been_audited', 'regularly'],
        ['reg.audit_cadence', 'annual'],
        ['org.multi_country', 'false'],
      ],
      technology_landscape: [
        ['tech.cloud_usage', 'aws'],
        ['tech.has_sso', 'yes'],
        ['tech.sso_provider', 'azure_ad'],
        ['tech.mfa_enabled', 'true'],
        ['tech.current_grc_tool', 'spreadsheets'],
        ['tech.connectors', '["jira","slack"]'],
      ],
      governance_model: [
        ['gov.decision_making', 'committees'],
        ['gov.approval_model', 'dual_approval'],
        ['gov.escalation_model', 'tiered'],
        ['gov.has_committees', 'true'],
        ['gov.has_risk_committee', 'true'],
        ['gov.has_audit_committee', 'true'],
        ['gov.has_policies', 'good'],
        ['gov.risk_appetite', 'conservative'],
        ['gov.committee_set', '["risk","audit","compliance"]'],
      ],
      risk_compliance_maturity: [
        ['risk.matrix_size', '5x5'],
        ['risk.domains_enabled', '["cyber","operational","compliance","financial"]'],
        ['evidence.has_collection', 'true'],
      ],
      operating_model: [
        ['ops.evidence_mode', 'hybrid'],
        ['ops.control_testing_model', 'continuous'],
        ['ops.reporting_cadence', 'monthly'],
        ['ops.compliance_cadence', 'quarterly'],
        ['ops.primary_framework_goal', 'ISO27001'],
        ['ops.retention_years', '7'],
        ['ops.incident_response_sla', '4h'],
        ['ops.risk_assessment_frequency', 'quarterly'],
        ['ops.policy_review_cycle', 'annual'],
        ['ops.audit_universe_size', '50'],
        ['ops.audit_plan_start_month', 'january'],
        ['ops.audit_methodology', 'risk_based'],
        ['ops.dashboard_profile', 'ciso'],
        ['ops.evidence_sources', '["manual","automated","api"]'],
        ['ops.auto_collectors', 'true'],
        ['ops.qiyas_enabled', 'true'],
        ['ops.qiyas_peer_group', 'financial_sector'],
      ],
      people_ownership: [
        ['people.executive_sponsor', 'CEO'],
        ['people.ciso_name', 'Ahmad Test'],
        ['people.ciso_reports_to', 'CEO'],
        ['people.tenant_admin_email', TEST_EMAIL],
        ['people.risk_lead_email', 'risk@test.com'],
        ['people.compliance_lead_email', 'compliance@test.com'],
        ['people.auditor_email', 'auditor@test.com'],
        ['people.send_invitations', 'true'],
        ['people.auto_create_teams', 'true'],
        ['PERSON_PROFILES', JSON.stringify([
          { fullName: 'Ahmad Test', workEmail: 'ahmad@test.com', businessFunction: 'risk_management', jobTitle: 'CISO' },
          { fullName: 'Sara Test', workEmail: 'sara@test.com', businessFunction: 'compliance', jobTitle: 'Compliance Lead' },
          { fullName: 'Khalid Test', workEmail: 'khalid@test.com', businessFunction: 'audit', jobTitle: 'Internal Auditor' },
        ])],
        ['CONFIRMED_ASSIGNMENTS', JSON.stringify([
          { personId: null, workEmail: 'ahmad@test.com', moduleCode: 'risk', responsibilityType: 'owner', isPrimary: true, roleCode: 'ciso' },
          { personId: null, workEmail: 'sara@test.com', moduleCode: 'compliance', responsibilityType: 'owner', isPrimary: true, roleCode: 'compliance_lead' },
          { personId: null, workEmail: 'khalid@test.com', moduleCode: 'audit', responsibilityType: 'owner', isPrimary: true, roleCode: 'auditor' },
        ])],
        ['RESPONSIBILITY_MATRIX', JSON.stringify([
          { moduleCode: 'risk', responsible: 'ahmad@test.com', accountable: 'CEO', consulted: 'sara@test.com', informed: 'khalid@test.com' },
        ])],
      ],
      org_structure: [
        ['DEPARTMENTS_ENABLED', '["risk","compliance","audit","it","legal"]'],
        ['structure.departments_enabled', '["risk","compliance","audit","it","legal"]'],
      ],
      data_start_mode: [
        ['ws.startup_mode', 'guided'],
      ],
      personalization: [
        ['ws.dashboard_profile', 'ciso'],
        ['ws.risk_appetite', 'conservative'],
        ['ws.enabled_modules', '["risk","compliance","audit","controls","evidence","policy","governance","incidents","workflow"]'],
      ],
      pack_selection: [
        ['enabled_modules', '["risk","compliance","audit","controls","evidence","policy","governance","incidents","workflow"]'],
      ],
    };

    it('all stage questions are loadable from question bank', async () => {
      const stages = await q(`SELECT DISTINCT stage_code FROM public.onboarding_question_bank WHERE is_active = true`);
      expect(stages.rows.length).toBeGreaterThanOrEqual(15);

      const stageSet = new Set(stages.rows.map((r: any) => r.stage_code));
      const requiredStages = ['organization_identity', 'regulatory_scope', 'technology_landscape',
        'governance_model', 'operating_model', 'people_ownership', 'personalization'];
      for (const s of requiredStages) {
        expect(stageSet.has(s), `Stage ${s} missing from question bank`).toBe(true);
      }
    });

    it('submits and records answers for all stages', async () => {
      let totalInserted = 0;
      for (const [stage, answers] of Object.entries(STAGE_ANSWERS)) {
        for (const [qCode, val] of answers) {
          const isJson = typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'));
          await q(
            `INSERT INTO public.onboarding_answers (session_id, question_code, answer_text, answer_json, answered_by_user_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT (session_id, question_code) DO UPDATE SET
               answer_text = EXCLUDED.answer_text, answer_json = EXCLUDED.answer_json, updated_at = NOW()`,
            [sessionId, qCode, isJson ? null : val, isJson ? val : null, userId]
          );
          totalInserted++;
        }
      }
      expect(totalInserted).toBeGreaterThan(60);

      const allAnswers = await q(`SELECT COUNT(*) as cnt FROM public.onboarding_answers WHERE session_id = $1`, [sessionId]);
      expect(parseInt(allAnswers.rows[0].cnt)).toBeGreaterThan(60);
    });

    it('answers are retrievable as answer map (getAnswerMap pattern)', async () => {
      const rows = await q(
        `SELECT question_code, answer_text, answer_json FROM public.onboarding_answers WHERE session_id = $1`,
        [sessionId]
      );
      const map: Record<string, unknown> = {};
      for (const row of rows.rows as any[]) {
        let parsed: unknown = undefined;
        if (row.answer_json) {
          try { parsed = JSON.parse(row.answer_json); } catch { parsed = row.answer_json; }
        }
        map[row.question_code] = parsed ?? row.answer_text;
      }

      expect(map['org.display_name']).toBe(TEST_ORG);
      expect(map['reg.frameworks_confirmed']).toEqual(['ISO27001', 'PDPL', 'NCA-ECC']);
      expect(map['tech.cloud_usage']).toBe('aws');
      expect(map['gov.decision_making']).toBe('committees');
      expect(map['ops.evidence_mode']).toBe('hybrid');
      expect(map['people.ciso_name']).toBe('Ahmad Test');
      expect(map['ws.dashboard_profile']).toBe('ciso');
      expect(map['ws.risk_appetite']).toBe('conservative');
      expect(Array.isArray(map['PERSON_PROFILES'])).toBe(true);
      expect((map['PERSON_PROFILES'] as unknown[]).length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════
  // STAGE 3: ANSWER → PROFILE MAPPING
  // ═══════════════════════════════════════════
  describe('Stage 3: Answer-to-Profile Mapping', () => {
    it('mapAnswersToNormalizedProfile produces all 9 sections from real answers', async () => {
      const rows = await q(
        `SELECT question_code, answer_text, answer_json FROM public.onboarding_answers WHERE session_id = $1`,
        [sessionId]
      );
      const answerMap: Record<string, unknown> = {};
      for (const row of rows.rows as any[]) {
        let parsed: unknown = undefined;
        if (row.answer_json) {
          try { parsed = JSON.parse(row.answer_json); } catch { parsed = row.answer_json; }
        }
        answerMap[row.question_code] = parsed ?? row.answer_text;
      }

      const { mapAnswersToNormalizedProfile } = await import(
        '../../modules/onboarding/source/backend/onboarding/mappers/normalized-profile.mapper'
      );
      const profile = await mapAnswersToNormalizedProfile(answerMap, 85);

      // organization
      expect(profile.organization).toBeDefined();
      expect(profile.organization.displayName).toBe(TEST_ORG);
      expect(profile.organization.arabicName).toBe('اختبار');
      expect(profile.organization.country).toBe('SA');
      expect(profile.organization.timezone).toBe('Asia/Riyadh');
      expect(profile.organization.fiscalYearEnd).toBe('december');
      expect(profile.organization.employeeBand).toBe('51-200');
      expect(profile.organization.languageCode).toBe('en');
      expect(profile.organization.registrationNumber).toBe('CR-12345');

      // regulatory
      expect(profile.regulatory).toBeDefined();
      expect(profile.regulatory.frameworksConfirmed).toEqual(['ISO27001', 'PDPL', 'NCA-ECC']);
      expect(profile.regulatory.authorities).toEqual(['SAMA']);
      expect(profile.regulatory.samaCompliance).toBe(true);
      expect(profile.regulatory.ncaRegistration).toBe(true);
      expect(profile.regulatory.auditCadence).toBe('annual');

      // technology
      expect(profile.technology).toBeDefined();
      expect(profile.technology.cloudProvider).toBe('aws');
      expect(profile.technology.hasSSO).toBe(true);
      expect(profile.technology.ssoProvider).toBe('azure_ad');
      expect(profile.technology.mfaEnabled).toBe(true);
      expect(profile.technology.connectors).toEqual(['jira', 'slack']);

      // governance
      expect(profile.governance).toBeDefined();
      expect(profile.governance.threeLines).toBe(true);
      expect(profile.governance.approvalModel).toBe('dual_approval');
      expect(profile.governance.hasCommittees).toBe(true);
      expect(profile.governance.hasRiskCommittee).toBe(true);
      expect(profile.governance.riskAppetite).toBe('conservative');

      // maturity
      expect(profile.maturity).toBeDefined();
      expect(profile.maturity.hasPolicyLibrary).toBe(true);
      expect(profile.maturity.overallLevel).toBe('managed');
      expect(profile.maturity.riskMatrix).toBe('5x5');
      expect(profile.maturity.riskDomainsEnabled).toEqual(['cyber', 'operational', 'compliance', 'financial']);

      // workspace
      expect(profile.workspace).toBeDefined();
      expect(profile.workspace.dashboardProfile).toBe('ciso');
      expect(profile.workspace.riskAppetite).toBe('conservative');
      expect(profile.workspace.startupMode).toBe('guided');
      expect(profile.workspace.enabledModules.length).toBeGreaterThanOrEqual(9);

      // operations
      expect(profile.operations).toBeDefined();
      expect(profile.operations.evidenceMode).toBe('hybrid');
      expect(profile.operations.controlTestingModel).toBe('continuous');
      expect(profile.operations.reportingCadence).toBe('monthly');
      expect(profile.operations.retentionPolicyYears).toBe(7);
      expect(profile.operations.auditUniverseSize).toBe('50');
      expect(profile.operations.auditMethodology).toBe('risk_based');
      expect(profile.operations.incidentResponseSla).toBe('4h');
      expect(profile.operations.qiyasEnabled).toBe(true);

      // structure
      expect(profile.structure).toBeDefined();
      expect(profile.structure.departmentsEnabled).toEqual(['risk', 'compliance', 'audit', 'it', 'legal']);

      // people
      expect(profile.people).toBeDefined();
      expect(profile.people.cisoName).toBe('Ahmad Test');
      expect(profile.people.executiveSponsor).toBe('CEO');
      expect(profile.people.personProfiles.length).toBe(3);
      expect(profile.people.confirmedAssignments.length).toBe(3);
      expect(profile.people.sendInvitations).toBe(true);
      expect(profile.people.autoCreateTeams).toBe(true);

      expect(profile.readinessScore).toBe(85);
    });
  });

  // ═══════════════════════════════════════════
  // STAGE 4: PROVISIONING — SCHEMA + STEPS
  // ═══════════════════════════════════════════
  describe('Stage 4: Provisioning — Tenant Schema DDL', () => {
    it('creates tenant schema with all required tables', async () => {
      await q(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

      const fs = await import('fs');
      const path = await import('path');
      const dbTsPath = path.resolve(__dirname, '../../modules/onboarding/source/config/db.ts');
      const dbSrc = fs.readFileSync(dbTsPath, 'utf-8');

      const tableRe = /CREATE TABLE IF NOT EXISTS\s+"\$\{schema\}"\.\"?(\w+)\"?\s*\(([\s\S]*?)\);/g;
      let match;
      const tables: string[] = [];
      while ((match = tableRe.exec(dbSrc)) !== null) {
        const tableName = match[1];
        const body = match[2];
        const resolvedBody = body.replace(/"\$\{schema\}"/g, `"${schemaName}"`);
        const ddl = `CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (${resolvedBody});`;
        try {
          await q(ddl);
          tables.push(tableName);
        } catch (e) {
          console.warn(`DDL failed for ${tableName}: ${(e as Error).message}`);
        }
      }

      expect(tables.length).toBeGreaterThan(30);

      const criticalTables = [
        'workspaces', 'workspace_profile', 'frameworks', 'controls', 'risks',
        'evidence_tasks', 'evidence_schedules', 'workflows', 'teams', 'team_members',
        'team_raci_assignments', 'role_profiles', 'dashboard_registry', 'navigation_registry',
        'feature_flags', 'person_profiles', 'module_assignments', 'obligations',
        'risk_appetite_config', 'authority_matrix', 'sla_config', 'connector_configs',
        'audit_plan', 'audit_universe', 'assessments', 'tenant_module_entitlements',
      ];

      for (const table of criticalTables) {
        const exists = await q(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
          [schemaName, table]
        );
        expect(exists.rows.length, `Table ${table} not found in schema ${schemaName}`).toBe(1);
      }
    });
  });

  // ═══════════════════════════════════════════
  // STAGE 5: PROVISIONING — SEED STEP EXECUTION
  // ═══════════════════════════════════════════
  describe('Stage 5: Seed Steps — Answer Data Flows to Workspace', () => {
    let profile: any;

    it('builds profile from answers for seeding', async () => {
      const rows = await q(
        `SELECT question_code, answer_text, answer_json FROM public.onboarding_answers WHERE session_id = $1`,
        [sessionId]
      );
      const answerMap: Record<string, unknown> = {};
      for (const row of rows.rows as any[]) {
        let parsed: unknown = undefined;
        if (row.answer_json) {
          try { parsed = JSON.parse(row.answer_json); } catch { parsed = row.answer_json; }
        }
        answerMap[row.question_code] = parsed ?? row.answer_text;
      }

      const { mapAnswersToNormalizedProfile } = await import(
        '../../modules/onboarding/source/backend/onboarding/mappers/normalized-profile.mapper'
      );
      profile = await mapAnswersToNormalizedProfile(answerMap, 85);
      expect(profile).toBeDefined();
    });

    it('seed_tenant_preferences — workspace_profile reflects user answers', async () => {
      const org = profile.organization;
      await q(
        `INSERT INTO "${schemaName}".workspace_profile
         (tenant_id, industry, org_size, sectors, default_dashboard, risk_appetite, settings)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb)
         ON CONFLICT (tenant_id) DO UPDATE SET
           industry = EXCLUDED.industry, org_size = EXCLUDED.org_size,
           default_dashboard = EXCLUDED.default_dashboard, risk_appetite = EXCLUDED.risk_appetite,
           settings = EXCLUDED.settings, updated_at = NOW()
         RETURNING tenant_id`,
        [
          tenantId,
          org.industry || 'other',
          org.employeeBand || '1-50',
          JSON.stringify(org.country ? [org.country] : []),
          profile.workspace.dashboardProfile || 'big_picture',
          profile.workspace.riskAppetite || 'moderate',
          JSON.stringify({
            fiscalYearEnd: org.fiscalYearEnd,
            evidenceMode: profile.operations?.evidenceMode || 'manual',
            controlTestingModel: profile.operations?.controlTestingModel || 'manual',
            retentionPolicyYears: profile.operations?.retentionPolicyYears ?? 5,
          }),
        ]
      );

      const wp = await q(`SELECT * FROM "${schemaName}".workspace_profile WHERE tenant_id = $1`, [tenantId]);
      expect(wp.rows.length).toBe(1);
      expect(wp.rows[0].industry).toBe('Financial Services');
      expect(wp.rows[0].org_size).toBe('51-200');
      expect(wp.rows[0].default_dashboard).toBe('ciso');
      expect(wp.rows[0].risk_appetite).toBe('conservative');
      const settings = typeof wp.rows[0].settings === 'string' ? JSON.parse(wp.rows[0].settings) : wp.rows[0].settings;
      expect(settings.evidenceMode).toBe('hybrid');
      expect(settings.controlTestingModel).toBe('continuous');
      expect(settings.retentionPolicyYears).toBe(7);
      expect(settings.fiscalYearEnd).toBe('december');
    });

    it('seed_frameworks — frameworks from user selection are seeded', async () => {
      const frameworks = profile.regulatory.frameworksConfirmed;
      expect(frameworks.length).toBeGreaterThanOrEqual(3);

      for (const fw of frameworks) {
        await q(
          `INSERT INTO "${schemaName}".frameworks (framework_id, name, description, category, status, workspace_id)
           VALUES ($1, $2, $3, 'compliance', 'not_started', NULL)
           ON CONFLICT (framework_id) DO UPDATE SET name = EXCLUDED.name`,
          [fw, fw, `${fw} framework`]
        );
      }

      const seeded = await q(`SELECT framework_id, name FROM "${schemaName}".frameworks`);
      expect(seeded.rows.length).toBeGreaterThanOrEqual(3);
      const fwIds = seeded.rows.map((r: any) => r.framework_id);
      expect(fwIds).toContain('ISO27001');
      expect(fwIds).toContain('PDPL');
      expect(fwIds).toContain('NCA-ECC');
    });

    it('seed_person_profiles — person data from onboarding flows to DB', async () => {
      const profiles = profile.people.personProfiles;
      expect(profiles.length).toBe(3);

      for (const person of profiles) {
        const p = person as Record<string, unknown>;
        await q(
          `INSERT INTO "${schemaName}".person_profiles
           (person_id, full_name, work_email, business_function, source, tenant_id, created_by)
           VALUES (gen_random_uuid(), $1, $2, $3, 'onboarding', $4, $5)
           ON CONFLICT DO NOTHING`,
          [p.fullName, p.workEmail, p.businessFunction, tenantId, userId]
        );
      }

      const persons = await q(`SELECT full_name, work_email, business_function FROM "${schemaName}".person_profiles`);
      expect(persons.rows.length).toBe(3);
      const names = persons.rows.map((r: any) => r.full_name);
      expect(names).toContain('Ahmad Test');
      expect(names).toContain('Sara Test');
      expect(names).toContain('Khalid Test');
      const functions = persons.rows.map((r: any) => r.business_function);
      expect(functions).toContain('risk_management');
      expect(functions).toContain('compliance');
      expect(functions).toContain('audit');
    });

    it('seed_module_assignments — role assignments from onboarding flow to DB', async () => {
      const assignments = profile.people.confirmedAssignments;
      expect(assignments.length).toBe(3);

      for (const a of assignments) {
        const assign = a as Record<string, unknown>;
        await q(
          `INSERT INTO "${schemaName}".module_assignments
           (user_id, person_id, module_code, scope_type, responsibility_type, is_primary, source, created_by)
           VALUES (NULL, NULL, $1, 'global', $2, $3, 'onboarding', $4)
           ON CONFLICT DO NOTHING`,
          [assign.moduleCode, assign.responsibilityType, assign.isPrimary ?? false, userId]
        );
      }

      const mods = await q(`SELECT module_code, responsibility_type, is_primary FROM "${schemaName}".module_assignments`);
      expect(mods.rows.length).toBe(3);
      const moduleCodes = mods.rows.map((r: any) => r.module_code);
      expect(moduleCodes).toContain('risk');
      expect(moduleCodes).toContain('compliance');
      expect(moduleCodes).toContain('audit');
    });

    it('seed_teams — teams created from person business functions', async () => {
      const personProfiles = profile.people.personProfiles;
      const functionGroups: Record<string, unknown[]> = {};
      for (const p of personProfiles) {
        const fn = (p as Record<string, unknown>).businessFunction as string || 'general';
        if (!functionGroups[fn]) functionGroups[fn] = [];
        functionGroups[fn].push(p);
      }

      for (const [fn, members] of Object.entries(functionGroups)) {
        const teamCode = `team_${fn}`;
        await q(
          `INSERT INTO "${schemaName}".teams (team_code, name_en, team_type, active, metadata)
           VALUES ($1, $2, 'operational', TRUE, $3::jsonb)
           ON CONFLICT (team_code) DO UPDATE SET name_en = EXCLUDED.name_en`,
          [teamCode, `${fn} Team`, JSON.stringify({ memberCount: members.length })]
        );
      }

      const teams = await q(`SELECT team_code, name_en FROM "${schemaName}".teams`);
      expect(teams.rows.length).toBe(3);
      const teamCodes = teams.rows.map((r: any) => r.team_code);
      expect(teamCodes).toContain('team_risk_management');
      expect(teamCodes).toContain('team_compliance');
      expect(teamCodes).toContain('team_audit');
    });

    it('seed_risk_appetite — risk appetite from governance answers', async () => {
      const wsResult = await q(
        `INSERT INTO "${schemaName}".workspaces (name, description, type, status)
         VALUES ($1, $2, 'enterprise_grc', 'provisioning')
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING workspace_id`,
        [`${TEST_ORG} GRC`, `AGRC-OS workspace`]
      );
      const workspaceId = wsResult.rows[0].workspace_id;

      await q(
        `INSERT INTO "${schemaName}".risk_appetite_config
         (workspace_id, appetite_name, overall_score, status, review_cycle)
         VALUES ($1, $2, $3, 'active', 'annual')
         ON CONFLICT (workspace_id) DO UPDATE SET appetite_name = EXCLUDED.appetite_name, overall_score = EXCLUDED.overall_score`,
        [workspaceId, profile.governance.riskAppetite || 'moderate', profile.governance.riskAppetite === 'conservative' ? 30 : 50]
      );

      const rac = await q(`SELECT appetite_name, overall_score FROM "${schemaName}".risk_appetite_config`);
      expect(rac.rows.length).toBe(1);
      expect(rac.rows[0].appetite_name).toBe('conservative');
      expect(parseFloat(rac.rows[0].overall_score)).toBe(30);
    });

    it('seed_feature_flags — modules enabled from user selection', async () => {
      const enabledModules = profile.workspace.enabledModules;
      for (const mod of enabledModules) {
        await q(
          `INSERT INTO "${schemaName}".feature_flags (feature_key, enabled, tenant_id)
           VALUES ($1, TRUE, $2)
           ON CONFLICT (feature_key) DO UPDATE SET enabled = TRUE`,
          [`module.${mod}`, tenantId]
        );
      }

      const flags = await q(`SELECT feature_key, enabled FROM "${schemaName}".feature_flags WHERE feature_key LIKE 'module.%'`);
      expect(flags.rows.length).toBeGreaterThanOrEqual(9);
      const enabledKeys = flags.rows.map((r: any) => r.feature_key.replace('module.', ''));
      expect(enabledKeys).toContain('risk');
      expect(enabledKeys).toContain('compliance');
      expect(enabledKeys).toContain('audit');
      expect(enabledKeys).toContain('governance');
    });

    it('seed_module_entitlements — tenant module entitlements from selection', async () => {
      const enabledModules = profile.workspace.enabledModules;
      for (const mod of enabledModules) {
        await q(
          `INSERT INTO "${schemaName}".tenant_module_entitlements (module_code, is_active, entitlement_source, activated_at)
           VALUES ($1, TRUE, 'onboarding', NOW())
           ON CONFLICT (module_code) DO UPDATE SET is_active = TRUE`,
          [mod]
        );
      }

      const ents = await q(`SELECT module_code, is_active FROM "${schemaName}".tenant_module_entitlements`);
      expect(ents.rows.length).toBeGreaterThanOrEqual(9);
      const entMods = ents.rows.map((r: any) => r.module_code);
      expect(entMods).toContain('risk');
      expect(entMods).toContain('compliance');
    });
  });

  // ═══════════════════════════════════════════
  // STAGE 6: WORKSPACE QUALITY VERIFICATION
  // ═══════════════════════════════════════════
  describe('Stage 6: Workspace Quality — End-to-End Verification', () => {
    it('workspace_profile matches user onboarding answers', async () => {
      const wp = await q(`SELECT * FROM "${schemaName}".workspace_profile WHERE tenant_id = $1`, [tenantId]);
      expect(wp.rows[0].default_dashboard).toBe('ciso');
      expect(wp.rows[0].risk_appetite).toBe('conservative');
      expect(wp.rows[0].industry).toBe('Financial Services');
    });

    it('frameworks match user regulatory selection', async () => {
      const fws = await q(`SELECT framework_id FROM "${schemaName}".frameworks ORDER BY framework_id`);
      const ids = fws.rows.map((r: any) => r.framework_id);
      expect(ids).toContain('ISO27001');
      expect(ids).toContain('PDPL');
      expect(ids).toContain('NCA-ECC');
    });

    it('person profiles match onboarding people answers', async () => {
      const persons = await q(`SELECT full_name, work_email, business_function FROM "${schemaName}".person_profiles ORDER BY full_name`);
      expect(persons.rows.length).toBe(3);
      expect(persons.rows[0].full_name).toBe('Ahmad Test');
      expect(persons.rows[0].business_function).toBe('risk_management');
    });

    it('module assignments match confirmed assignments from onboarding', async () => {
      const mods = await q(`SELECT module_code, responsibility_type FROM "${schemaName}".module_assignments ORDER BY module_code`);
      expect(mods.rows.length).toBe(3);
      const assignments = Object.fromEntries(mods.rows.map((r: any) => [r.module_code, r.responsibility_type]));
      expect(assignments.risk).toBe('owner');
      expect(assignments.compliance).toBe('owner');
      expect(assignments.audit).toBe('owner');
    });

    it('teams reflect organization structure from onboarding', async () => {
      const teams = await q(`SELECT team_code, name_en FROM "${schemaName}".teams ORDER BY team_code`);
      expect(teams.rows.length).toBe(3);
    });

    it('risk appetite config reflects governance answers', async () => {
      const rac = await q(`SELECT appetite_name, overall_score FROM "${schemaName}".risk_appetite_config`);
      expect(rac.rows[0].appetite_name).toBe('conservative');
    });

    it('enabled modules match user selection', async () => {
      const ents = await q(`SELECT module_code FROM "${schemaName}".tenant_module_entitlements WHERE is_active = TRUE ORDER BY module_code`);
      const mods = ents.rows.map((r: any) => r.module_code);
      expect(mods).toContain('risk');
      expect(mods).toContain('compliance');
      expect(mods).toContain('audit');
      expect(mods).toContain('controls');
      expect(mods).toContain('evidence');
      expect(mods).toContain('governance');
    });

    it('no answer data was lost in the pipeline', async () => {
      const answerCount = await q(`SELECT COUNT(*) as cnt FROM public.onboarding_answers WHERE session_id = $1`, [sessionId]);
      expect(parseInt(answerCount.rows[0].cnt)).toBeGreaterThan(60);

      const wp = await q(`SELECT settings FROM "${schemaName}".workspace_profile WHERE tenant_id = $1`, [tenantId]);
      const settings = typeof wp.rows[0].settings === 'string' ? JSON.parse(wp.rows[0].settings) : wp.rows[0].settings;
      expect(settings.evidenceMode).toBe('hybrid');
      expect(settings.controlTestingModel).toBe('continuous');
      expect(settings.retentionPolicyYears).toBe(7);
    });
  });
});
