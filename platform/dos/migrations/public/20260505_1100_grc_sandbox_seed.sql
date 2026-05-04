-- Phase 1: DB-Driven GRC Sandbox
-- Migration: 20260505_1100_grc_sandbox_seed.sql
-- Purpose: Seed sample GRC data for interactive sandbox experience
--
-- This migration seeds sample controls, frameworks, and regulators data
-- to enable an interactive sandbox experience for visitors.

-- Seed compliance frameworks (using sandbox tenant)
INSERT INTO dos.compliance_frameworks (framework_id, tenant_id, name, description, version, status, created_at)
VALUES
  (gen_random_uuid(), 'sandbox', 'NESA', 'National Cybersecurity Authority - Saudi Arabia', '1.0', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'ISO 27001', 'Information Security Management System', '2013', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'SOC 2', 'Service Organization Control 2', '2017', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'GDPR', 'General Data Protection Regulation', '2018', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'PCI DSS', 'Payment Card Industry Data Security Standard', '4.0', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'HIPAA', 'Health Insurance Portability and Accountability Act', '1996', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'CMMC', 'Cybersecurity Maturity Model Certification', '2.0', 'active', NOW()),
  (gen_random_uuid(), 'sandbox', 'NIST 800-53', 'Security and Privacy Controls', 'Rev 5', 'active', NOW())
ON CONFLICT DO NOTHING;

-- Seed sample controls (using sandbox tenant and framework IDs)
-- Note: We need to reference the framework_ids from the previous insert
-- For now, we'll use a CTE to get the framework IDs
WITH framework_ids AS (
  SELECT framework_id, name FROM dos.compliance_frameworks WHERE tenant_id = 'sandbox'
)
INSERT INTO dos.controls (control_id, tenant_id, framework_id, control_ref, title, description, status, created_at)
SELECT
  gen_random_uuid(),
  'sandbox',
  fi.framework_id,
  CASE fi.name
    WHEN 'NESA' THEN 'NESA-' || ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
    WHEN 'ISO 27001' THEN 'ISO-A.' || ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
    WHEN 'SOC 2' THEN 'SOC-CC' || ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
    WHEN 'GDPR' THEN 'GDPR-' || ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
    ELSE 'CTRL-' || ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
  END,
  CASE fi.name
    WHEN 'NESA' THEN CASE ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
      WHEN 1 THEN 'Access Control'
      WHEN 2 THEN 'Encryption'
      WHEN 3 THEN 'Logging'
      WHEN 4 THEN 'Incident Response'
      WHEN 5 THEN 'Vulnerability Management'
    END
    WHEN 'ISO 27001' THEN CASE ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
      WHEN 1 THEN 'Access Control'
      WHEN 2 THEN 'Cryptography'
      WHEN 3 THEN 'Operations Security'
      WHEN 4 THEN 'System Acquisition'
      WHEN 5 THEN 'Supplier Relationships'
    END
    ELSE 'Sample Control'
  END,
  CASE fi.name
    WHEN 'NESA' THEN CASE ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
      WHEN 1 THEN 'Control access to systems and data based on business requirements'
      WHEN 2 THEN 'Encrypt sensitive data at rest and in transit'
      WHEN 3 THEN 'Maintain comprehensive audit logs'
      WHEN 4 THEN 'Establish incident response procedures'
      WHEN 5 THEN 'Regular vulnerability scanning and patching'
    END
    WHEN 'ISO 27001' THEN CASE ROW_NUMBER() OVER (PARTITION BY fi.name ORDER BY fi.name)
      WHEN 1 THEN 'Control access to information'
      WHEN 2 THEN 'Use cryptography to protect information'
      WHEN 3 THEN 'Protect information in operations'
      WHEN 4 THEN 'Acquire information systems securely'
      WHEN 5 THEN 'Manage supplier security'
    END
    ELSE 'Sample control description'
  END,
  'implemented',
  NOW()
FROM framework_ids fi
CROSS JOIN (SELECT generate_series(1, 5) AS seq) s
WHERE fi.name IN ('NESA', 'ISO 27001')
ON CONFLICT DO NOTHING;

-- Seed compliance requirements (sample)
WITH control_ids AS (
  SELECT control_id, control_ref FROM dos.controls WHERE tenant_id = 'sandbox' LIMIT 5
)
INSERT INTO dos.compliance_requirements (requirement_id, tenant_id, framework_id, code, title, description, status, created_at)
SELECT
  gen_random_uuid(),
  'sandbox',
  (SELECT framework_id FROM dos.compliance_frameworks WHERE tenant_id = 'sandbox' LIMIT 1),
  'REQ-' || ROW_NUMBER() OVER (ORDER BY ci.control_ref),
  CASE ROW_NUMBER() OVER (ORDER BY ci.control_ref)
    WHEN 1 THEN 'Multi-factor Authentication'
    WHEN 2 THEN 'AES-256 Encryption'
    WHEN 3 THEN 'Audit Log Retention'
    WHEN 4 THEN 'Incident Response Plan'
    WHEN 5 THEN 'Quarterly Vulnerability Scans'
  END,
  CASE ROW_NUMBER() OVER (ORDER BY ci.control_ref)
    WHEN 1 THEN 'Implement MFA for all user accounts'
    WHEN 2 THEN 'Use AES-256 for data encryption'
    WHEN 3 THEN 'Retain logs for minimum 12 months'
    WHEN 4 THEN 'Document and test incident response procedures'
    WHEN 5 THEN 'Conduct vulnerability scans quarterly'
  END,
  'pending',
  NOW()
FROM control_ids ci
ON CONFLICT DO NOTHING;
