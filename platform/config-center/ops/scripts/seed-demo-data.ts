/**
 * Seed Demo Data for Investor Presentations / Testing
 * Populates comprehensive GRC data with realistic scenarios, user personas, and multi-tenant isolation.
 *
 * Usage: npx tsx ops/scripts/seed-demo-data.ts
 */
import { Pool } from 'pg';
import crypto from 'node:crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc',
});

async function q(sql: string, params?: any[]) {
  return pool.query(sql, params).catch(err => {
    // Safely ignore missing tables for modules not yet deployed
    if (err.code !== '42P01') throw err;
    console.warn(`  ⚠ Table missing (skipped): ${err.message.split('"')[1] || 'unknown'}`);
    return { rows: [] };
  });
}

function generateId() {
  return crypto.randomUUID();
}

async function seedDemo() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  DOS Platform Demo Data Seed                 ║');
  console.log('╚══════════════════════════════════════════════╝');

  // ── 1. Create Demo Tenants ──────────────────────────────────────
  const tenants = [
    { id: generateId(), name: 'Demo Banking Corp', slug: 'demo-banking', domain: 'banking.demo.shahin-ai.com', industry: 'banking', size: '201-1000' },
    { id: generateId(), name: 'Healthcare Plus', slug: 'demo-healthcare', domain: 'healthcare.demo.shahin-ai.com', industry: 'healthcare', size: '51-200' },
    { id: generateId(), name: 'Tech Startup Inc', slug: 'demo-tech', domain: 'tech.demo.shahin-ai.com', industry: 'technology', size: '1-50' },
  ];

  for (const t of tenants) {
    // dos.tenants (user-service / tenant-service)
    await q(
      `INSERT INTO dos.tenants (tenant_id, name, slug, domain, status, plan, config, metadata, created_at, updated_at, activated_at)
       VALUES ($1, $2, $3, $4, 'active', 'enterprise', '{}'::jsonb, '{}'::jsonb, NOW(), NOW(), NOW())
       ON CONFLICT (tenant_id) DO NOTHING`,
      [t.id, t.name, t.slug, t.domain],
    );
    // public.tenants (auth-service)
    await q(
      `INSERT INTO public.tenants (tenant_id, tenant_code, tenant_name_en, schema_name, org_name, industry, org_size, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
       ON CONFLICT (tenant_id) DO NOTHING`,
      [t.id, `tc_${t.slug}`, t.name, `schema_${t.slug}`, t.name, t.industry, t.size],
    );
    // Product activation
    await q(
      `INSERT INTO dos.tenant_product_activation (tenant_id, product_code) VALUES ($1, 'agrc') ON CONFLICT DO NOTHING`,
      [t.id],
    );
  }
  console.log(`  ✓ Tenants: ${tenants.length} created`);

  // ── 2. Create User Personas (admin, auditor, viewer per tenant) ─
  const personas = [
    // Banking Corp — 5 personas
    { tenant: 0, email: 'ahmed.al-saud@banking.demo.shahin-ai.com', first: 'Ahmed', last: 'Al Saud', role: 'tenant_admin', dept: 'IT' },
    { tenant: 0, email: 'fatima.khalid@banking.demo.shahin-ai.com', first: 'Fatima', last: 'Khalid', role: 'risk_manager', dept: 'Risk' },
    { tenant: 0, email: 'mohammed.ali@banking.demo.shahin-ai.com', first: 'Mohammed', last: 'Ali', role: 'compliance_officer', dept: 'Compliance' },
    { tenant: 0, email: 'sarah.hassan@banking.demo.shahin-ai.com', first: 'Sarah', last: 'Hassan', role: 'auditor', dept: 'Internal Audit' },
    { tenant: 0, email: 'khalid.omer@banking.demo.shahin-ai.com', first: 'Khalid', last: 'Omer', role: 'viewer', dept: 'Operations' },
    // Healthcare Plus — 3 personas (admin, auditor, viewer)
    { tenant: 1, email: 'dr.layla@healthcare.demo.shahin-ai.com', first: 'Layla', last: 'Mohammed', role: 'tenant_admin', dept: 'Administration' },
    { tenant: 1, email: 'zainab.ali@healthcare.demo.shahin-ai.com', first: 'Zainab', last: 'Ali', role: 'auditor', dept: 'Quality' },
    { tenant: 1, email: 'omar.ahmed@healthcare.demo.shahin-ai.com', first: 'Omar', last: 'Ahmed', role: 'viewer', dept: 'Clinical' },
    // Tech Startup — 3 personas (admin, auditor, viewer)
    { tenant: 2, email: 'john.smith@tech.demo.shahin-ai.com', first: 'John', last: 'Smith', role: 'tenant_admin', dept: 'Engineering' },
    { tenant: 2, email: 'jane.doe@tech.demo.shahin-ai.com', first: 'Jane', last: 'Doe', role: 'auditor', dept: 'Security' },
    { tenant: 2, email: 'alex.chen@tech.demo.shahin-ai.com', first: 'Alex', last: 'Chen', role: 'viewer', dept: 'Product' },
  ];

  for (const p of personas) {
    const tenantId = tenants[p.tenant].id;
    const userId = generateId();
    // dos.users
    await q(
      `INSERT INTO dos.users (user_id, email, display_name, first_name, last_name, department, status, role, tenant_id,
         is_super_admin, onboarding_complete, locale, timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, FALSE, TRUE, 'en', 'UTC', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, p.email, `${p.first} ${p.last}`, p.first, p.last, p.dept, p.role, tenantId],
    );
    // Role assignment
    await q(
      `INSERT INTO dos.user_role_assignments (assignment_id, user_id, role_code, tenant_id, granted_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), TRUE)
       ON CONFLICT DO NOTHING`,
      [generateId(), userId, p.role, tenantId],
    );
  }
  console.log(`  ✓ User personas: ${personas.length} created (admin + auditor + viewer per tenant)`);

  // ── 3. Compliance Frameworks (5+ across tenants) ────────────────
  const frameworks = [
    // Banking (3)
    { tenant: 0, name: 'SAMA - Saudi Arabian Monetary Authority', desc: 'Banking regulatory framework for Saudi Arabia', version: '2.0' },
    { tenant: 0, name: 'Basel III - Capital Adequacy', desc: 'International banking capital requirements', version: '3.1' },
    { tenant: 0, name: 'AML/CFT Framework', desc: 'Anti-Money Laundering and Counter-Financing of Terrorism', version: '1.0' },
    // Healthcare (3)
    { tenant: 1, name: 'HIPAA - Health Insurance Portability', desc: 'US healthcare data protection standards', version: '2.0' },
    { tenant: 1, name: 'SFDA - Saudi Food & Drug Authority', desc: 'Saudi healthcare regulatory framework', version: '1.5' },
    { tenant: 1, name: 'ISO 27001 - Healthcare ISMS', desc: 'Information security management for healthcare', version: '2022' },
    // Tech (3)
    { tenant: 2, name: 'SOC 2 Type II', desc: 'Security and availability controls for SaaS', version: '2.0' },
    { tenant: 2, name: 'GDPR - Data Protection', desc: 'European Union data protection regulation', version: '2016' },
    { tenant: 2, name: 'ISO 27001 - Cloud Security', desc: 'Cloud security best practices', version: '2022' },
  ];

  const frameworkIds: string[] = [];
  for (const f of frameworks) {
    const fId = generateId();
    frameworkIds.push(fId);
    await q(
      `INSERT INTO dos.compliance_frameworks (framework_id, tenant_id, name, description, version, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [fId, tenants[f.tenant].id, f.name, f.desc, f.version],
    );
  }
  console.log(`  ✓ Compliance frameworks: ${frameworks.length} created`);

  // ── 4. Risks (10+ across tenants) ───────────────────────────────
  const risks = [
    // Banking (5)
    { tenant: 0, title: 'Cybersecurity Threat - Phishing Attacks', cat: 'cybersecurity', likelihood: 3, impact: 4, status: 'identified' },
    { tenant: 0, title: 'Credit Risk - Loan Portfolio Default', cat: 'financial', likelihood: 3, impact: 5, status: 'identified' },
    { tenant: 0, title: 'Operational Risk - System Outage', cat: 'operational', likelihood: 2, impact: 5, status: 'mitigated' },
    { tenant: 0, title: 'Compliance Risk - Regulatory Violations', cat: 'compliance', likelihood: 2, impact: 4, status: 'identified' },
    { tenant: 0, title: 'Liquidity Risk - Cash Flow Mismatch', cat: 'financial', likelihood: 3, impact: 3, status: 'identified' },
    // Healthcare (4)
    { tenant: 1, title: 'Patient Data Privacy Breach', cat: 'privacy', likelihood: 3, impact: 5, status: 'identified' },
    { tenant: 1, title: 'Medical Device Failure', cat: 'operational', likelihood: 2, impact: 5, status: 'mitigated' },
    { tenant: 1, title: 'Regulatory Compliance - SFDA', cat: 'compliance', likelihood: 2, impact: 3, status: 'identified' },
    { tenant: 1, title: 'Supply Chain Disruption', cat: 'operational', likelihood: 3, impact: 3, status: 'identified' },
    // Tech (3)
    { tenant: 2, title: 'Data Breach - Customer Information', cat: 'cybersecurity', likelihood: 3, impact: 5, status: 'identified' },
    { tenant: 2, title: 'Service Availability - Cloud Outage', cat: 'operational', likelihood: 3, impact: 4, status: 'mitigated' },
    { tenant: 2, title: 'IP Protection - Source Code Theft', cat: 'intellectual_property', likelihood: 2, impact: 5, status: 'identified' },
  ];

  for (const r of risks) {
    await q(
      `INSERT INTO dos.risks (risk_id, tenant_id, title, description, category, likelihood, impact, risk_score, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [generateId(), tenants[r.tenant].id, r.title, `Risk scenario: ${r.title}`, r.cat, r.likelihood, r.impact, r.likelihood * r.impact, r.status],
    );
  }
  console.log(`  ✓ Risks: ${risks.length} created`);

  // ── 5. Audit Plans (3+ across tenants) ──────────────────────────
  const auditPlans = [
    { tenant: 0, name: 'Q1 2026 Internal Audit - Cybersecurity', type: 'cybersecurity', scope: 'All IT systems and networks', freq: 'quarterly', year: 2026 },
    { tenant: 0, name: 'Annual SAMA Compliance Audit', type: 'regulatory', scope: 'All banking operations', freq: 'annual', year: 2026 },
    { tenant: 0, name: 'AML/CFT Process Audit', type: 'compliance', scope: 'Transaction monitoring systems', freq: 'semi-annual', year: 2026 },
    { tenant: 1, name: 'HIPAA Compliance Audit 2026', type: 'compliance', scope: 'Patient data handling and storage', freq: 'annual', year: 2026 },
    { tenant: 1, name: 'Medical Equipment Safety Audit', type: 'operational', scope: 'All medical devices and equipment', freq: 'quarterly', year: 2026 },
    { tenant: 2, name: 'SOC 2 Type II Readiness Assessment', type: 'compliance', scope: 'Security and availability controls', freq: 'annual', year: 2026 },
    { tenant: 2, name: 'GDPR Data Protection Audit', type: 'privacy', scope: 'EU customer data processing', freq: 'annual', year: 2026 },
  ];

  for (const plan of auditPlans) {
    await q(
      `INSERT INTO dos.audit_plans (plan_id, tenant_id, name, audit_type, scope, frequency, year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'planning', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [generateId(), tenants[plan.tenant].id, plan.name, plan.type, plan.scope, plan.freq, plan.year],
    );
  }
  console.log(`  ✓ Audit plans: ${auditPlans.length} created`);

  // ── 6. Controls (linked to frameworks) ──────────────────────────
  const controlStatuses = ['implemented', 'partially_implemented', 'not_implemented'];
  let controlCount = 0;
  for (let fi = 0; fi < frameworks.length; fi++) {
    const tenantId = tenants[frameworks[fi].tenant].id;
    const fwId = frameworkIds[fi];
    for (let c = 1; c <= 5; c++) {
      const status = controlStatuses[c % controlStatuses.length];
      await q(
        `INSERT INTO dos.controls (control_id, tenant_id, framework_id, control_ref, title, description, status, effectiveness, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [generateId(), tenantId, fwId, `CTRL-${fi + 1}.${c}`, `Control ${c} for ${frameworks[fi].name}`, `Automated control assessment`, status, status === 'implemented' ? 'effective' : 'needs_review'],
      );
      controlCount++;
    }
  }
  console.log(`  ✓ Controls: ${controlCount} created (5 per framework)`);

  // ── 7. Evidence items ───────────────────────────────────────────
  const evidenceTypes = ['policy_document', 'procedure_manual', 'training_record', 'system_log', 'audit_report', 'risk_assessment'];
  let evidenceCount = 0;
  for (const tenant of tenants) {
    for (let i = 1; i <= 10; i++) {
      const evType = evidenceTypes[(i - 1) % evidenceTypes.length];
      await q(
        `INSERT INTO dos.evidence (evidence_id, tenant_id, title, type, status, file_path, uploaded_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'collected', '/evidence/sample.pdf', 'system', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [generateId(), tenant.id, `${evType.replace(/_/g, ' ').toUpperCase()} ${i}`, evType],
      );
      evidenceCount++;
    }
  }
  console.log(`  ✓ Evidence: ${evidenceCount} items created`);

  // ── Summary ─────────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  DEMO SEED COMPLETE                          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Tenants:       ${tenants.length}                            ║`);
  console.log(`║  Users:         ${personas.length}                           ║`);
  console.log(`║  Frameworks:    ${frameworks.length}                            ║`);
  console.log(`║  Risks:         ${risks.length}                           ║`);
  console.log(`║  Audit Plans:   ${auditPlans.length}                            ║`);
  console.log(`║  Controls:      ${controlCount}                           ║`);
  console.log(`║  Evidence:      ${evidenceCount}                           ║`);
  console.log('╚══════════════════════════════════════════════╝');
}

seedDemo()
  .then(() => pool.end())
  .catch(err => { console.error('Demo seed failed:', err); pool.end(); process.exit(1); });
