-- AI-OS Wave 2 — Per-agent domain data seeds.
--
-- Each AI agent needs real domain rows to ground its output. Without
-- this seed most tenants only have foundation rows and A03/A04/A05/A07/
-- A09/A11 produce empty answers.
--
-- Tables seeded (per agent assignment):
--   A03/A04 → frameworks + controls
--   A05     → evidence_requests
--   A07     → risks
--   A09     → vendor_profiles
--   A11     → bcp_plans
--
-- Idempotent: ON CONFLICT on each table's natural unique key. The
-- system-seed UUID 00000000-0000-0000-0000-000000000001 is used for
-- created_by/requested_by where a real user is required.
--
-- Runs against the active tenant schema; resolves tenant_id from the
-- schema name (UUID-named tenants only — legacy short-named schemas
-- are skipped silently).

BEGIN;

DO $$
DECLARE
  this_tenant   uuid;
  ws_id         uuid;
  system_user   uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  BEGIN
    SELECT (
      SUBSTRING(current_schema FROM 8 FOR 8) || '-' ||
      SUBSTRING(current_schema FROM 16 FOR 4) || '-' ||
      SUBSTRING(current_schema FROM 20 FOR 4) || '-' ||
      SUBSTRING(current_schema FROM 24 FOR 4) || '-' ||
      SUBSTRING(current_schema FROM 28 FOR 12)
    )::uuid INTO this_tenant;
  EXCEPTION WHEN others THEN
    RAISE NOTICE '[057] schema % is not UUID-named — skipping domain seed', current_schema;
    RETURN;
  END;

  -- Use the first existing workspace if any; otherwise NULL is fine for
  -- the per-tenant tables that allow it.
  SELECT workspace_id INTO ws_id FROM workspaces LIMIT 1;

  ----------------------------------------------------------------------
  -- A03/A04 — frameworks
  ----------------------------------------------------------------------
  INSERT INTO frameworks (framework_id, name, description, category, status, mandatory, total_controls, workspace_id, tenant_id)
  VALUES
    ('NCA-ECC-2',     'NCA Essential Cybersecurity Controls v2', 'Saudi National Cybersecurity Authority — 114 controls across 5 domains', 'compliance', 'in_progress', TRUE,  114, ws_id, this_tenant::text),
    ('SAMA-CSF-1.0',  'SAMA Cyber Security Framework',           'Saudi Central Bank framework for FSI sector — 4 domains, 31 sub-domains', 'compliance', 'not_started', TRUE,   97, ws_id, this_tenant::text),
    ('ISO-27001:2022','ISO/IEC 27001:2022 Annex A',              '93 information security controls in 4 themes (organizational, people, physical, technological)', 'compliance', 'in_progress', FALSE, 93, ws_id, this_tenant::text),
    ('NIST-CSF-2.0',  'NIST Cybersecurity Framework 2.0',        'Six functions: Govern, Identify, Protect, Detect, Respond, Recover', 'compliance', 'not_started', FALSE, 108, ws_id, this_tenant::text),
    ('PDPL-KSA',      'KSA Personal Data Protection Law',         'Saudi PDPL implementing regulations — controller/processor obligations and rights', 'privacy', 'in_progress', TRUE, 24, ws_id, this_tenant::text)
  ON CONFLICT (framework_id) DO NOTHING;

  ----------------------------------------------------------------------
  -- A04 — controls (one curated control per framework + a few extras)
  ----------------------------------------------------------------------
  INSERT INTO controls (control_id, title, description, frameworks, domain_name, status, priority, workspace_id, tenant_id)
  VALUES
    ('NCA-ECC-1-1',  'Cybersecurity Strategy',                'Define and approve a cybersecurity strategy aligned with business objectives.', ARRAY['NCA-ECC-2'], 'Cybersecurity Governance', 'in_progress', 'high',   ws_id, this_tenant::text),
    ('NCA-ECC-2-1',  'Asset Management',                      'Identify, classify and protect organisational assets across their lifecycle.',  ARRAY['NCA-ECC-2'], 'Cybersecurity Defence',     'not_started','medium', ws_id, this_tenant::text),
    ('NCA-ECC-2-3',  'Identity & Access Management',          'Provision, review and revoke access using least-privilege.',                    ARRAY['NCA-ECC-2','ISO-27001:2022'], 'Identity & Access', 'in_progress','high',   ws_id, this_tenant::text),
    ('NCA-ECC-2-7',  'Cybersecurity Incident & Threat Mgmt',  'Establish and operate incident detection, response and lessons-learned process.', ARRAY['NCA-ECC-2','NIST-CSF-2.0'], 'Resilience',       'not_started','high',   ws_id, this_tenant::text),
    ('SAMA-3-1-1',   'Cyber Security Governance',             'Board oversight, written policies, RACI for cyber roles.',                      ARRAY['SAMA-CSF-1.0'], 'Cyber Risk Mgmt',     'not_started','medium', ws_id, this_tenant::text),
    ('ISO-A-5.7',    'Threat Intelligence',                   'Collect, analyse and act on threat intelligence relevant to the organisation.', ARRAY['ISO-27001:2022','NIST-CSF-2.0'], 'Organizational', 'in_progress','medium', ws_id, this_tenant::text),
    ('ISO-A-8.16',   'Monitoring Activities',                 'Network/system monitoring detects anomalous behaviour.',                        ARRAY['ISO-27001:2022'], 'Technological',     'in_progress','medium', ws_id, this_tenant::text),
    ('NIST-PR.AC-1', 'Identities and Credentials Issued',     'Manage identities and credentials for authorised devices, users, and processes.', ARRAY['NIST-CSF-2.0'], 'Protect',         'not_started','medium', ws_id, this_tenant::text),
    ('PDPL-12',      'Lawful Basis for Processing',           'Establish and document a lawful basis (consent, contract, vital interest, ...) for every processing activity.', ARRAY['PDPL-KSA'], 'Privacy', 'in_progress', 'high', ws_id, this_tenant::text),
    ('PDPL-19',      'Data Subject Rights',                   'Process access/rectify/erasure/portability requests within statutory timeframes.', ARRAY['PDPL-KSA'], 'Privacy', 'not_started','high', ws_id, this_tenant::text)
  ON CONFLICT (control_id) DO NOTHING;

  -- Update frameworks.total_controls so the domain count matches reality.
  UPDATE frameworks f
     SET total_controls = sub.n
    FROM (
      SELECT framework_token AS code, count(*)::int AS n
        FROM controls, unnest(frameworks) AS framework_token
       GROUP BY 1
    ) sub
   WHERE f.framework_id = sub.code;

  ----------------------------------------------------------------------
  -- A07 — risks
  ----------------------------------------------------------------------
  INSERT INTO risks (risk_id, title, description, category, likelihood, impact, status, priority, workspace_id, tenant_id, risk_category)
  VALUES
    ('R-001', 'Unpatched internet-facing systems',
       'Public web servers running EoL OS or unpatched CVEs ≥ 90 days. Likely exploit vector for opportunistic intrusion.',
       'cyber', 4, 5, 'identified', 'high',     ws_id, this_tenant::text, 'cybersecurity'),
    ('R-002', 'Privileged account abuse',
       'No SoD between dba and infra admin. Risk of unauthorised data export or audit-log tampering.',
       'cyber', 3, 5, 'identified', 'high',     ws_id, this_tenant::text, 'cybersecurity'),
    ('R-003', 'Third-party SaaS data residency drift',
       'Vendor changed processing region without notice, exposing PDPL cross-border transfer obligations.',
       'compliance', 3, 4, 'mitigating', 'medium', ws_id, this_tenant::text, 'regulatory'),
    ('R-004', 'Single-region cloud dependency',
       'No multi-AZ failover for the primary OLTP DB. RTO/RPO targets unmet during regional outage.',
       'operational', 2, 5, 'identified', 'high', ws_id, this_tenant::text, 'business_continuity'),
    ('R-005', 'Phishing susceptibility',
       'Last simulation: 18% click-through. Sustained driver for credential-theft incidents.',
       'cyber', 4, 3, 'mitigating', 'medium', ws_id, this_tenant::text, 'cybersecurity'),
    ('R-006', 'Unmonitored shadow IT SaaS',
       'CASB shows ~40 unsanctioned SaaS apps with corporate auth tokens — risk of data leakage.',
       'cyber', 3, 4, 'identified', 'medium', ws_id, this_tenant::text, 'cybersecurity'),
    ('R-007', 'PII over-collection in marketing forms',
       'Forms harvest national-id without contractual basis — PDPL Art.12 violation exposure.',
       'compliance', 3, 4, 'identified', 'high', ws_id, this_tenant::text, 'regulatory')
  ON CONFLICT (risk_id) DO NOTHING;

  ----------------------------------------------------------------------
  -- A05 — evidence_requests
  ----------------------------------------------------------------------
  INSERT INTO evidence_requests (id, tenant_id, entity_type, entity_id, requested_by, title, instructions, status, priority, due_date)
  VALUES
    (gen_random_uuid(), this_tenant, 'control', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
       'NCA-ECC-2-3 — Q3 access review evidence',
       'Attach screenshot of the access-review workflow output for privileged accounts plus the signed attestation.',
       'open', 'high', (NOW() + INTERVAL '7 days')::date),
    (gen_random_uuid(), this_tenant, 'control', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
       'ISO-A-8.16 — SIEM alert sample',
       'Provide last 30 days of SIEM detections grouped by severity, with one closed-incident worked example.',
       'open', 'medium', (NOW() + INTERVAL '14 days')::date),
    (gen_random_uuid(), this_tenant, 'risk', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
       'R-001 — Patch status report',
       'Export from CMDB / vuln scanner showing current EoL OS and ≥90-day open CVEs on internet-facing systems.',
       'open', 'high', (NOW() + INTERVAL '5 days')::date),
    (gen_random_uuid(), this_tenant, 'framework', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
       'PDPL — Records of Processing',
       'Upload the current ROPA spreadsheet covering each controller business unit.',
       'open', 'medium', (NOW() + INTERVAL '30 days')::date),
    (gen_random_uuid(), this_tenant, 'control', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
       'SAMA-3-1-1 — Cyber governance minutes',
       'Latest two board-level cyber-risk committee meeting minutes redacted as needed.',
       'open', 'medium', (NOW() + INTERVAL '21 days')::date)
  ON CONFLICT DO NOTHING;

  ----------------------------------------------------------------------
  -- A09 — vendor_profiles
  ----------------------------------------------------------------------
  INSERT INTO vendor_profiles (id, tenant_id, name, category, tier, status, contact_email, sla_notes, risk_score, created_by)
  VALUES
    (gen_random_uuid(), this_tenant, 'Cloud Hyperscaler — Region East',  'cloud_iaas',     'tier_1', 'active',   'security@cloud.example', '99.95% monthly SLA, breach-notification 24h', 28.5, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Managed SOC Services',              'security_msp',   'tier_1', 'active',   'soc@vendor.example',     '24/7 IR, 15-min response on Sev1',           18.0, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Payroll SaaS',                      'hr_saas',        'tier_2', 'active',   'support@payroll.example','Monthly DPA, EU+KSA processing only',         32.0, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Marketing Email Provider',          'marketing_saas', 'tier_3', 'active',   'support@email.example',  'No DPA, US-only processing — reviewing.',     67.0, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'External Penetration-Test Boutique','assurance',      'tier_2', 'active',   'engagements@pt.example', 'Annual retest + report; 30-day vuln SLA',     22.0, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Open-Source Code Repository',       'devops_saas',    'tier_2', 'active',   'security@repo.example',  '99.9% SLA, supply-chain SBOMs published',     19.0, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Office Cleaning & Facilities',      'facilities',     'tier_4', 'active',   'service@facilities.example','Background-checked staff, NDA on file',     12.0, '00000000-0000-0000-0000-000000000001'::uuid)
  ON CONFLICT DO NOTHING;

  ----------------------------------------------------------------------
  -- A11 — bcp_plans
  ----------------------------------------------------------------------
  INSERT INTO bcp_plans (id, tenant_id, title, version, status, plan_type, scope, rto_hours, rpo_hours, last_tested_at, next_test_date, created_by)
  VALUES
    (gen_random_uuid(), this_tenant, 'Enterprise BCP — Operational Continuity', 3, 'approved', 'business_continuity',
       'All revenue-generating business units; OLTP + analytics platforms; customer-facing portals.', 4, 1,
       NOW() - INTERVAL '60 days', (NOW() + INTERVAL '6 months')::date, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'IT Disaster Recovery Plan',                2, 'approved', 'disaster_recovery',
       'Tier-1 systems: ERP, GRC platform, customer portal, identity provider.',                     2, 1,
       NOW() - INTERVAL '90 days', (NOW() + INTERVAL '3 months')::date, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Cyber Incident Response Plan',             4, 'approved', 'incident_response',
       'Cyber events ranked Sev1/Sev2; PR + legal coordination; PDPL breach notification timelines.', 1, 0,
       NOW() - INTERVAL '30 days', (NOW() + INTERVAL '3 months')::date, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Pandemic / Workforce Continuity Plan',     1, 'draft',    'business_continuity',
       'Remote-work activation, leadership succession, critical-role coverage during extended absences.', 24, 24,
       NULL, (NOW() + INTERVAL '90 days')::date, '00000000-0000-0000-0000-000000000001'::uuid),
    (gen_random_uuid(), this_tenant, 'Third-Party Concentration Risk Playbook',  1, 'draft',    'business_continuity',
       'Steps when a tier-1 SaaS vendor suffers prolonged outage; manual fallbacks and SLA-clock pause.', 8, 4,
       NULL, (NOW() + INTERVAL '120 days')::date, '00000000-0000-0000-0000-000000000001'::uuid)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '[057] Domain data seeded for tenant % (frameworks/controls/risks/evidence_requests/vendors/bcp_plans)', this_tenant;
END$$;

COMMIT;
