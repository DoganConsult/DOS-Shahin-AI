import { safeQuery } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';

interface PersonInput {
  userId: string;
  fullName: string;
  businessFunction: string;
  [key: string]: any;
}

interface StaffingRecommendation {
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string | null;
  roleCategory: string;
  recommendedFte: number;
  isMandatory: boolean;
  priority: number;
  shahinTitleEn: string | null;
  shahinTitleAr: string | null;
  descriptionEn: string | null;
  sortOrder: number;
}

interface BusinessFunction {
  functionCode: string;
  functionNameEn: string;
  functionNameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  category: string;
  isCore: boolean;
  minOrgSize: string;
  typicalSizeMin: number | null;
  typicalSizeMax: number | null;
  isGrcCritical: boolean;
  requiredForSectors: string[];
  sortOrder: number;
}

interface ResponsibilitySuggestion {
  personId: string;
  fullName: string;
  suggestedRoles: Array<{
    roleCode: string;
    roleName: string;
    confidence: number;
    reason: string;
  }>;
}

interface AutoSuggestionResult {
  suggestions: ResponsibilitySuggestion[];
  staffingGaps: Array<{
    roleCode: string;
    roleName: string;
    isMandatory: boolean;
    status: 'unassigned' | 'understaffed';
  }>;
  status: 'complete' | 'partial';
}

export async function computeAutoSuggestions(
  _tenantId: string,
  persons: PersonInput[],
  enabledModules: string[],
  employeeBand?: string,
  sectorCode?: string,
): Promise<AutoSuggestionResult> {
  const rangeCode = employeeBand || '1_50';
  const sector = sectorCode || '*';

  const staffing = await queryStaffing(rangeCode, sector);
  const functionMap = await queryBusinessFunctionMap();

  const suggestions: ResponsibilitySuggestion[] = [];
  const assignedRoles = new Set<string>();

  for (const person of persons) {
    const fn = person.businessFunction?.toLowerCase() || '';
    const matched: ResponsibilitySuggestion['suggestedRoles'] = [];

    for (const role of staffing) {
      if (assignedRoles.has(role.roleCode) && role.recommendedFte <= 1) continue;

      const modulePrefix = role.roleCode.split('_')[0];
      const isModuleRelevant =
        enabledModules.length === 0 ||
        enabledModules.some(m => m.toLowerCase() === modulePrefix) ||
        role.roleCategory === 'core' ||
        role.isMandatory;

      if (!isModuleRelevant) continue;

      const confidence = computeMatchConfidence(fn, role, functionMap);
      if (confidence > 0.3) {
        matched.push({
          roleCode: role.roleCode,
          roleName: role.roleNameEn,
          confidence,
          reason: confidence >= 0.7 ? 'strong_function_match' : 'partial_function_match',
        });
      }
    }

    matched.sort((a, b) => b.confidence - a.confidence);
    const top = matched.slice(0, 3);
    for (const m of top) assignedRoles.add(m.roleCode);

    suggestions.push({
      personId: person.userId,
      fullName: person.fullName,
      suggestedRoles: top,
    });
  }

  const staffingGaps = staffing
    .filter(r => r.isMandatory && !assignedRoles.has(r.roleCode))
    .map(r => ({
      roleCode: r.roleCode,
      roleName: r.roleNameEn,
      isMandatory: r.isMandatory,
      status: 'unassigned' as const,
    }));

  return {
    suggestions,
    staffingGaps,
    status: staffingGaps.length === 0 ? 'complete' : 'partial',
  };
}

export async function getStaffingForOrgSize(
  rangeCode: string,
  sectorCode: string,
): Promise<StaffingRecommendation[]> {
  return queryStaffing(rangeCode, sectorCode);
}

export async function getBusinessFunctions(
  rangeCode?: string,
): Promise<BusinessFunction[]> {
  let sql = `SELECT function_code, function_name_en, function_name_ar,
                    description_en, description_ar, category,
                    is_core, min_org_size, typical_size_min, typical_size_max,
                    is_grc_critical, required_for_sectors, sort_order
             FROM public.lookup_team_functions
             WHERE is_active = TRUE`;
  const params: string[] = [];

  if (rangeCode) {
    sql += ` AND min_org_size <= $1`;
    params.push(rangeCode);
  }

  sql += ` ORDER BY is_core DESC, sort_order, function_name_en`;

  try {
    const res = await safeQuery(sql, params);
    return res.rows.map((r: Record<string, any>) => ({
      functionCode: r.function_code as string,
      functionNameEn: r.function_name_en as string,
      functionNameAr: (r.function_name_ar as string) ?? null,
      descriptionEn: (r.description_en as string) ?? null,
      descriptionAr: (r.description_ar as string) ?? null,
      category: (r.category as string) || 'general',
      isCore: r.is_core as boolean,
      minOrgSize: (r.min_org_size as string) || '1_10',
      typicalSizeMin: (r.typical_size_min as number) ?? null,
      typicalSizeMax: (r.typical_size_max as number) ?? null,
      isGrcCritical: (r.is_grc_critical as boolean) || false,
      requiredForSectors: (r.required_for_sectors as string[]) || [],
      sortOrder: (r.sort_order as number) || 0,
    }));
  } catch (err) {
    logger.error('[DOS Foundation] getBusinessFunctions error:', String(err));
    return [];
  }
}

async function queryStaffing(rangeCode: string, sectorCode: string): Promise<StaffingRecommendation[]> {
  try {
    const res = await safeQuery(
      `SELECT role_code, role_name_en, role_name_ar, role_category,
              recommended_fte, is_mandatory, priority,
              shahin_title_en, shahin_title_ar, description_en, sort_order
       FROM public.lookup_grc_role_staffing
       WHERE range_code = $1 AND (sector_code = $2 OR sector_code = '*')
         AND is_active = TRUE
       ORDER BY is_mandatory DESC, priority ASC, sort_order`,
      [rangeCode, sectorCode],
    );
    return res.rows.map((r: Record<string, any>) => ({
      roleCode: r.role_code as string,
      roleNameEn: r.role_name_en as string,
      roleNameAr: (r.role_name_ar as string) ?? null,
      roleCategory: (r.role_category as string) || 'core',
      recommendedFte: parseFloat(String(r.recommended_fte)) || 1,
      isMandatory: r.is_mandatory as boolean,
      priority: (r.priority as number) || 50,
      shahinTitleEn: (r.shahin_title_en as string) ?? null,
      shahinTitleAr: (r.shahin_title_ar as string) ?? null,
      descriptionEn: (r.description_en as string) ?? null,
      sortOrder: (r.sort_order as number) || 0,
    }));
  } catch (err) {
    logger.error('[DOS Foundation] queryStaffing error:', String(err));
    return [];
  }
}

async function queryBusinessFunctionMap(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const res = await safeQuery(
      `SELECT function_code, category
       FROM public.lookup_team_functions
       WHERE is_active = TRUE`,
    );
    for (const r of res.rows) {
      const cat = (r.category || 'general').toLowerCase();
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r.function_code);
    }
  } catch {
    // non-fatal
  }
  return map;
}

function computeMatchConfidence(
  personFunction: string,
  role: StaffingRecommendation,
  _functionMap: Map<string, string[]>,
): number {
  if (!personFunction) return role.isMandatory ? 0.35 : 0.1;

  const fn = personFunction.toLowerCase();
  const rc = role.roleCode.toLowerCase();
  const rn = role.roleNameEn.toLowerCase();
  const cat = role.roleCategory.toLowerCase();

  if (fn === rc || fn === rn) return 1.0;
  if (rn.includes(fn) || fn.includes(rn)) return 0.85;
  if (rc.includes(fn) || fn.includes(rc)) return 0.8;

  const keywords: Record<string, string[]> = {
    risk: ['risk', 'erm', 'threat', 'hazard'],
    compliance: ['compliance', 'regulatory', 'legal', 'policy'],
    audit: ['audit', 'assurance', 'internal_audit', 'external_audit'],
    security: ['security', 'infosec', 'cybersecurity', 'iso27001', 'ciso'],
    governance: ['governance', 'board', 'grc', 'oversight'],
    privacy: ['privacy', 'dpo', 'data_protection', 'pdpl', 'gdpr'],
    it: ['it', 'technology', 'infrastructure', 'devops', 'engineering'],
    finance: ['finance', 'accounting', 'treasury', 'cfo'],
    hr: ['hr', 'human_resources', 'people', 'talent'],
    operations: ['operations', 'ops', 'process', 'quality'],
  };

  for (const [domain, kws] of Object.entries(keywords)) {
    const fnMatch = kws.some(k => fn.includes(k));
    const roleMatch = cat === domain || kws.some(k => rc.includes(k) || rn.includes(k));
    if (fnMatch && roleMatch) return 0.7;
  }

  return role.isMandatory ? 0.35 : 0.1;
}
