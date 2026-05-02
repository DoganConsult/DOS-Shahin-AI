/**
 * Multi-Jurisdiction Framework Registry — Pillar 6
 *
 * Centralizes framework definitions across jurisdictions.
 * Supports: KSA, UAE, EU, US, Global
 */

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface JurisdictionFramework {
  code: string;
  name: string;
  nameAr?: string;
  jurisdiction: 'KSA' | 'UAE' | 'EU' | 'US' | 'GLOBAL';
  regulator: string;
  regulatorAr?: string;
  category: 'cybersecurity' | 'data_privacy' | 'financial' | 'ai_governance' | 'general' | 'cloud' | 'industry';
  controlCount: number;
  version: string;
  effectiveDate: string;
  sectors: string[]; // applicable sectors
  description: string;
}

export const FRAMEWORK_REGISTRY: JurisdictionFramework[] = [
  // ── KSA (existing) ──
  { code: 'NCA-ECC', name: 'NCA Essential Cybersecurity Controls', nameAr: 'الضوابط الأساسية للأمن السيبراني', jurisdiction: 'KSA', regulator: 'NCA', regulatorAr: 'الهيئة الوطنية للأمن السيبراني', category: 'cybersecurity', controlCount: 114, version: '2.0', effectiveDate: '2024-01-01', sectors: ['all'], description: 'Mandatory cybersecurity controls for all Saudi organizations' },
  { code: 'SAMA-CSF', name: 'SAMA Cyber Security Framework', nameAr: 'إطار الأمن السيبراني لساما', jurisdiction: 'KSA', regulator: 'SAMA', regulatorAr: 'البنك المركزي السعودي', category: 'cybersecurity', controlCount: 195, version: '1.0', effectiveDate: '2020-05-01', sectors: ['banking', 'insurance', 'fintech'], description: 'Cybersecurity framework for financial institutions' },
  { code: 'PDPL', name: 'Personal Data Protection Law', nameAr: 'نظام حماية البيانات الشخصية', jurisdiction: 'KSA', regulator: 'SDAIA', regulatorAr: 'الهيئة السعودية للبيانات والذكاء الاصطناعي', category: 'data_privacy', controlCount: 43, version: '1.0', effectiveDate: '2023-09-14', sectors: ['all'], description: 'Saudi personal data protection regulation' },
  { code: 'NCA-CCC', name: 'NCA Cloud Computing Controls', jurisdiction: 'KSA', regulator: 'NCA', category: 'cloud', controlCount: 86, version: '1.0', effectiveDate: '2024-01-01', sectors: ['all'], description: 'Cloud security controls for Saudi organizations' },

  // ── UAE ──
  { code: 'ADGM-FSRA', name: 'ADGM Financial Services Regulatory Framework', jurisdiction: 'UAE', regulator: 'ADGM', category: 'financial', controlCount: 120, version: '2024', effectiveDate: '2024-01-01', sectors: ['banking', 'insurance', 'fintech'], description: 'Abu Dhabi financial services regulatory framework' },
  { code: 'CBUAE-ISS', name: 'CBUAE Information Security Standards', jurisdiction: 'UAE', regulator: 'CBUAE', category: 'cybersecurity', controlCount: 158, version: '1.0', effectiveDate: '2023-06-01', sectors: ['banking', 'insurance'], description: 'UAE Central Bank information security standards' },
  { code: 'IRA-ISR', name: 'UAE IA Information Security Regulation', jurisdiction: 'UAE', regulator: 'TRA/IRA', category: 'cybersecurity', controlCount: 92, version: '2.0', effectiveDate: '2024-01-01', sectors: ['all'], description: 'UAE Information Assurance security regulation' },
  { code: 'UAE-DPL', name: 'UAE Federal Data Protection Law', jurisdiction: 'UAE', regulator: 'UAE Government', category: 'data_privacy', controlCount: 35, version: '1.0', effectiveDate: '2022-01-02', sectors: ['all'], description: 'UAE federal personal data protection law' },
  { code: 'DIFC-DPL', name: 'DIFC Data Protection Law', jurisdiction: 'UAE', regulator: 'DIFC', category: 'data_privacy', controlCount: 48, version: '2020', effectiveDate: '2020-07-01', sectors: ['difc'], description: 'DIFC data protection requirements' },

  // ── EU ──
  { code: 'GDPR', name: 'General Data Protection Regulation', jurisdiction: 'EU', regulator: 'European Commission', category: 'data_privacy', controlCount: 99, version: '2016/679', effectiveDate: '2018-05-25', sectors: ['all'], description: 'EU data protection and privacy regulation' },
  { code: 'DORA', name: 'Digital Operational Resilience Act', jurisdiction: 'EU', regulator: 'EBA/ESMA/EIOPA', category: 'cybersecurity', controlCount: 145, version: '2022/2554', effectiveDate: '2025-01-17', sectors: ['banking', 'insurance', 'fintech'], description: 'EU digital operational resilience for financial entities' },
  { code: 'NIS2', name: 'Network and Information Security Directive 2', jurisdiction: 'EU', regulator: 'ENISA', category: 'cybersecurity', controlCount: 82, version: '2022/2555', effectiveDate: '2024-10-17', sectors: ['essential', 'important'], description: 'EU cybersecurity obligations for essential services' },
  { code: 'EU-AI-ACT', name: 'EU Artificial Intelligence Act', jurisdiction: 'EU', regulator: 'European Commission', category: 'ai_governance', controlCount: 68, version: '2024/1689', effectiveDate: '2025-08-01', sectors: ['all'], description: 'EU regulation on artificial intelligence systems' },
  { code: 'eIDAS2', name: 'eIDAS 2.0 Regulation', jurisdiction: 'EU', regulator: 'European Commission', category: 'general', controlCount: 45, version: '2.0', effectiveDate: '2024-05-20', sectors: ['all'], description: 'EU electronic identification and trust services' },

  // ── US ──
  { code: 'NIST-CSF', name: 'NIST Cybersecurity Framework', jurisdiction: 'US', regulator: 'NIST', category: 'cybersecurity', controlCount: 108, version: '2.0', effectiveDate: '2024-02-26', sectors: ['all'], description: 'US cybersecurity risk management framework' },
  { code: 'SOX', name: 'Sarbanes-Oxley Act', jurisdiction: 'US', regulator: 'SEC', category: 'financial', controlCount: 65, version: '2002', effectiveDate: '2002-07-30', sectors: ['public_companies'], description: 'US financial reporting and internal controls' },
  { code: 'HIPAA', name: 'Health Insurance Portability and Accountability Act', jurisdiction: 'US', regulator: 'HHS', category: 'data_privacy', controlCount: 75, version: '1996', effectiveDate: '2003-04-14', sectors: ['healthcare'], description: 'US health information privacy and security' },
  { code: 'CMMC', name: 'Cybersecurity Maturity Model Certification', jurisdiction: 'US', regulator: 'DoD', category: 'cybersecurity', controlCount: 171, version: '2.0', effectiveDate: '2024-12-16', sectors: ['defense'], description: 'US defense supply chain cybersecurity' },
  { code: 'CCPA-CPRA', name: 'California Consumer Privacy Act / CPRA', jurisdiction: 'US', regulator: 'CPPA', category: 'data_privacy', controlCount: 42, version: '2023', effectiveDate: '2023-01-01', sectors: ['all'], description: 'California data privacy regulation' },

  // ── GLOBAL ──
  { code: 'ISO-27001', name: 'ISO/IEC 27001:2022', jurisdiction: 'GLOBAL', regulator: 'ISO', category: 'cybersecurity', controlCount: 93, version: '2022', effectiveDate: '2022-10-25', sectors: ['all'], description: 'International information security management system standard' },
  { code: 'SOC2', name: 'SOC 2 Type II', jurisdiction: 'GLOBAL', regulator: 'AICPA', category: 'general', controlCount: 64, version: '2017', effectiveDate: '2017-12-15', sectors: ['technology', 'saas'], description: 'Service organization controls for trust services criteria' },
  { code: 'PCI-DSS', name: 'Payment Card Industry Data Security Standard', jurisdiction: 'GLOBAL', regulator: 'PCI SSC', category: 'financial', controlCount: 264, version: '4.0.1', effectiveDate: '2024-03-31', sectors: ['payments', 'retail', 'banking'], description: 'Payment card data security requirements' },
  { code: 'CSA-CCM', name: 'Cloud Security Alliance CCM', jurisdiction: 'GLOBAL', regulator: 'CSA', category: 'cloud', controlCount: 197, version: '4.0', effectiveDate: '2021-06-01', sectors: ['cloud'], description: 'Cloud security controls matrix' },
  { code: 'ISO-42001', name: 'ISO/IEC 42001:2023', jurisdiction: 'GLOBAL', regulator: 'ISO', category: 'ai_governance', controlCount: 39, version: '2023', effectiveDate: '2023-12-18', sectors: ['all'], description: 'AI management system standard' },
];

export function getFrameworksByJurisdiction(jurisdiction?: string): JurisdictionFramework[] {
  if (!jurisdiction) return FRAMEWORK_REGISTRY;
  return FRAMEWORK_REGISTRY.filter(f => f.jurisdiction === jurisdiction.toUpperCase());
}

export function getFrameworkByCode(code: string): JurisdictionFramework | undefined {
  return FRAMEWORK_REGISTRY.find(f => f.code === code);
}

export function getFrameworksBySector(sector: string): JurisdictionFramework[] {
  return FRAMEWORK_REGISTRY.filter(f => f.sectors.includes(sector) || f.sectors.includes('all'));
}

export function getFrameworksByCategory(category: string): JurisdictionFramework[] {
  return FRAMEWORK_REGISTRY.filter(f => f.category === category);
}

/**
 * Cross-jurisdiction gap analysis — compare what a tenant has vs. what a jurisdiction requires.
 */
export async function crossJurisdictionGapAnalysis(tenantId: string, targetJurisdiction: string): Promise<{
  currentFrameworks: string[];
  requiredFrameworks: JurisdictionFramework[];
  gaps: JurisdictionFramework[];
  coverage: number;
}> {
  const s = tenantSchema(tenantId);

  const current = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT DISTINCT framework_code FROM "${s}".frameworks WHERE is_active = true`
  ), { tenantId: tenantId, operation: 'query frameworks' });

  const currentCodes = new Set((current.rows as Record<string, unknown>[][]).map(r => r.framework_code));

  const required = getFrameworksByJurisdiction(targetJurisdiction);
  const gaps = required.filter(f => !currentCodes.has(f.code));

  return {
    currentFrameworks: [...currentCodes] as string[],
    requiredFrameworks: required,
    gaps,
    coverage: required.length > 0 ? Math.round(((required.length - gaps.length) / required.length) * 100) : 100,
  };
}

// ── Cross-Framework Control Mapping ──

export interface ControlMapping {
  sourceFramework: string;
  sourceControl: string;
  targetFramework: string;
  targetControl: string;
  mappingType: 'equivalent' | 'partial' | 'related';
  confidence: number;
}

export const CROSS_FRAMEWORK_MAPPINGS: ControlMapping[] = [
  // ISO 27001 ↔ NCA ECC
  { sourceFramework: 'ISO-27001', sourceControl: 'A.5.1', targetFramework: 'NCA-ECC', targetControl: '1-1', mappingType: 'equivalent', confidence: 0.95 },
  { sourceFramework: 'ISO-27001', sourceControl: 'A.8.1', targetFramework: 'NCA-ECC', targetControl: '2-1', mappingType: 'partial', confidence: 0.8 },
  // ISO 27001 ↔ NIST CSF
  { sourceFramework: 'ISO-27001', sourceControl: 'A.5.1', targetFramework: 'NIST-CSF', targetControl: 'GV.PO-01', mappingType: 'equivalent', confidence: 0.9 },
  { sourceFramework: 'ISO-27001', sourceControl: 'A.8.1', targetFramework: 'NIST-CSF', targetControl: 'PR.DS-01', mappingType: 'partial', confidence: 0.85 },
  // GDPR ↔ PDPL
  { sourceFramework: 'GDPR', sourceControl: 'Art.5', targetFramework: 'PDPL', targetControl: '5', mappingType: 'equivalent', confidence: 0.85 },
  { sourceFramework: 'GDPR', sourceControl: 'Art.6', targetFramework: 'PDPL', targetControl: '6', mappingType: 'partial', confidence: 0.8 },
  { sourceFramework: 'GDPR', sourceControl: 'Art.17', targetFramework: 'PDPL', targetControl: '20', mappingType: 'related', confidence: 0.75 },
  // DORA ↔ SAMA-CSF
  { sourceFramework: 'DORA', sourceControl: 'Art.5', targetFramework: 'SAMA-CSF', targetControl: '1.1', mappingType: 'partial', confidence: 0.7 },
  // NIS2 ↔ ISO 27001
  { sourceFramework: 'NIS2', sourceControl: 'Art.21.2.a', targetFramework: 'ISO-27001', targetControl: 'A.5.1', mappingType: 'partial', confidence: 0.8 },
  // SOC2 ↔ ISO 27001
  { sourceFramework: 'SOC2', sourceControl: 'CC6.1', targetFramework: 'ISO-27001', targetControl: 'A.8.1', mappingType: 'equivalent', confidence: 0.9 },
  // PCI-DSS ↔ ISO 27001
  { sourceFramework: 'PCI-DSS', sourceControl: 'Req.1', targetFramework: 'ISO-27001', targetControl: 'A.8.20', mappingType: 'partial', confidence: 0.8 },
];

export function getControlMappings(frameworkCode: string): ControlMapping[] {
  return CROSS_FRAMEWORK_MAPPINGS.filter(
    m => m.sourceFramework === frameworkCode || m.targetFramework === frameworkCode
  );
}

export function listJurisdictions(_tenantId: string): unknown[] { return getFrameworksByJurisdiction(); }
