import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types';
import { FRAMEWORK_REGISTRY, type JurisdictionFramework } from './jurisdiction-registry.service';

export interface KsaCatalogEntry {
  catalogId: string;
  frameworkCode: string;
  frameworkName: string;
  frameworkNameAr: string;
  jurisdiction: string;
  regulator: string;
  regulatorAr: string;
  category: string;
  controlCount: number;
  version: string;
  effectiveDate: string;
  sectors: string[];
  description: string;
  isActive: boolean;
  tenantEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KsaCatalogListResult {
  entries: KsaCatalogEntry[];
  total: number;
  ksaOnly: number;
}

export interface KsaCatalogFilters {
  jurisdiction?: string;
  category?: string;
  sector?: string;
  enabledOnly?: boolean;
}

export interface KsaAuthorityEntry {
  authorityCode: string;
  authorityNameEn: string;
  authorityNameAr: string;
  authorityType: string;
  authorityAcronym: string;
  isActive: boolean;
  frameworks: string[];
}

function frameworkToEntry(fw: JurisdictionFramework, tenantEnabled: boolean): KsaCatalogEntry {
  return {
    catalogId: `catalog-${fw.code}`,
    frameworkCode: fw.code,
    frameworkName: fw.name,
    frameworkNameAr: fw.nameAr ?? fw.name,
    jurisdiction: fw.jurisdiction,
    regulator: fw.regulator,
    regulatorAr: fw.regulatorAr ?? fw.regulator,
    category: fw.category,
    controlCount: fw.controlCount,
    version: fw.version,
    effectiveDate: fw.effectiveDate,
    sectors: fw.sectors,
    description: fw.description,
    isActive: true,
    tenantEnabled,
    createdAt: fw.effectiveDate,
    updatedAt: new Date().toISOString(),
  };
}

export async function listKsaCatalog(
  tenantId: string,
  filters: KsaCatalogFilters = {}
): Promise<KsaCatalogListResult> {
  const schema = tenantSchema(tenantId);

  const enabledRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT DISTINCT framework_code FROM "${schema}".frameworks WHERE status IN ('active', 'enabled') OR status IS NULL`,
    []
  ), { tenantId, operation: 'list catalog frameworks' });

  const enabledCodes = new Set<string>(
    enabledRes.rows.map((r: GenericRow) => String(r.framework_code))
  );

  let entries = FRAMEWORK_REGISTRY.map(fw =>
    frameworkToEntry(fw, enabledCodes.has(fw.code))
  );

  if (filters.jurisdiction) {
    entries = entries.filter(e => e.jurisdiction === filters.jurisdiction);
  }
  if (filters.category) {
    entries = entries.filter(e => e.category === filters.category);
  }
  if (filters.sector) {
    entries = entries.filter(e =>
      e.sectors.includes('all') || e.sectors.includes(filters.sector!)
    );
  }
  if (filters.enabledOnly) {
    entries = entries.filter(e => e.tenantEnabled);
  }

  const ksaOnly = entries.filter(e => e.jurisdiction === 'KSA').length;

  return { entries, total: entries.length, ksaOnly };
}

export async function getKsaCatalogEntry(
  tenantId: string,
  frameworkCode: string
): Promise<KsaCatalogEntry | null> {
  const schema = tenantSchema(tenantId);

  const fw = FRAMEWORK_REGISTRY.find(f => f.code === frameworkCode);
  if (!fw) return null;

  const enabledRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT framework_code FROM "${schema}".frameworks WHERE framework_code = $1 AND (status IN ('active', 'enabled') OR status IS NULL)`,
    [frameworkCode]
  ), { tenantId, operation: 'get catalog entry' });

  const tenantEnabled = enabledRes.rows.length > 0;
  return frameworkToEntry(fw, tenantEnabled);
}

export async function listKsaAuthorities(tenantId: string): Promise<KsaAuthorityEntry[]> {
  const authRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT authority_code, authority_name_en, authority_name_ar, authority_type, authority_acronym, is_active
     FROM public.lookup_ksa_regulatory_authorities
     WHERE is_active = true
     ORDER BY authority_acronym`,
    []
  ), { tenantId, operation: 'list ksa authorities' });

  return authRes.rows.map((r: GenericRow) => {
    const code = String(r.authority_acronym ?? r.authority_code ?? '');
    const frameworks = FRAMEWORK_REGISTRY
      .filter(fw => fw.regulator === code)
      .map(fw => fw.code);

    return {
      authorityCode: String(r.authority_code ?? ''),
      authorityNameEn: String(r.authority_name_en ?? ''),
      authorityNameAr: String(r.authority_name_ar ?? ''),
      authorityType: String(r.authority_type ?? ''),
      authorityAcronym: code,
      isActive: Boolean(r.is_active),
      frameworks,
    };
  });
}

export async function enableFrameworkForTenant(
  tenantId: string,
  frameworkCode: string
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ksa_regulatory_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function disableFrameworkForTenant(
  tenantId: string,
  frameworkCode: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".frameworks SET status = 'disabled', updated_at = NOW() WHERE framework_code = $1`,
    [frameworkCode]
  );

  logger.info('[KsaCatalog] framework disabled for tenant', { tenantId, frameworkCode });
}

export async function getKsaCatalogSummary(tenantId: string): Promise<{
  total: number;
  ksaFrameworks: number;
  enabledFrameworks: number;
  jurisdictions: string[];
  categories: string[];
}> {
  const result = await listKsaCatalog(tenantId);
  const jurisdictions = [...new Set(result.entries.map(e => e.jurisdiction))];
  const categories = [...new Set(result.entries.map(e => e.category))];
  const enabledFrameworks = result.entries.filter(e => e.tenantEnabled).length;

  return {
    total: result.total,
    ksaFrameworks: result.ksaOnly,
    enabledFrameworks,
    jurisdictions,
    categories,
  };
}
