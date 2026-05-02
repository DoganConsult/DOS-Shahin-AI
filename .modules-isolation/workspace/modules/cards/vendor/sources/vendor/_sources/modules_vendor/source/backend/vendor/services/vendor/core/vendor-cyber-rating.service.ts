import { emptyResult, query, tenantSchema } from '../../../ports/database.port';
import { getFirstRow, safeQuery } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowNull, swallowDefault, EC } from '@dos/platform-core/resilience';

export interface CyberRatingResult {
  vendorId: string;
  vendorDomain: string;
  provider: 'securityscorecard' | 'bitsight' | 'unconfigured';
  overallScore: number;
  grade: string;
  factors: {
    networkSecurity?: number;
    dnsHealth?: number;
    patchingCadence?: number;
    endpointSecurity?: number;
    ipReputation?: number;
    applicationSecurity?: number;
    cubitScore?: number;
    webAppSecurity?: number;
  };
  issues: Array<{
    category: string;
    severity: string;
    count: number;
  }>;
  lastFetchedAt: string;
  nextFetchAt: string;
}

async function fetchFromSecurityScorecard(
  domain: string,
  apiKey: string,
): Promise<Partial<CyberRatingResult>> {
  const baseUrl = 'https://api.securityscorecard.io';
  const headers = { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' };

  const resp = await fetch(`${baseUrl}/companies/${domain}`, { headers });
  if (!resp.ok) throw new Error(`SecurityScorecard API error: ${resp.status}`);
  const data = await resp.json() as any;

  return {
    provider: 'securityscorecard',
    overallScore: Number(data.score ?? 0),
    grade: data.grade ?? 'F',
    factors: {
      networkSecurity:    Number(data.network_security?.score ?? 0),
      dnsHealth:          Number(data.dns_health?.score ?? 0),
      patchingCadence:    Number(data.patching_cadence?.score ?? 0),
      endpointSecurity:   Number(data.endpoint_security?.score ?? 0),
      ipReputation:       Number(data.ip_reputation?.score ?? 0),
      applicationSecurity:Number(data.application_security?.score ?? 0),
    },
    issues: (data.factors ?? []).map((f: GenericRow) => ({
      category: f.name ?? 'any',
      severity: f.grade === 'A' ? 'low' : f.grade === 'B' ? 'medium' : 'high',
      count: Number(f.issue_count ?? 0),
    })),
  };
}

async function fetchFromBitSight(
  domain: string,
  apiKey: string,
): Promise<Partial<CyberRatingResult>> {
  const baseUrl = 'https://api.bitsighttech.com';
  const headers = { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` };

  const searchResp = await fetch(`${baseUrl}/ratings/v1/companies?name=${encodeURIComponent(domain)}`, { headers });
  if (!searchResp.ok) throw new Error(`BitSight API error: ${searchResp.status}`);
  const searchData = await searchResp.json() as any;
  const company = searchData.results?.[0];
  if (!company) throw new Error(`Company not found in BitSight: ${domain}`);

  const ratingResp = await fetch(`${baseUrl}/ratings/v1/companies/${company.guid}`, { headers });
  const ratingData = await ratingResp.json() as any;

  return {
    provider: 'bitsight',
    overallScore: Number(ratingData.rating ?? 0),
    grade: ratingData.rating_details?.grade ?? 'N/A',
    factors: {
      cubitScore:       Number(ratingData.rating_details?.cubit_score ?? 0),
      networkSecurity:  Number(ratingData.risk_vectors?.network_security?.grade_details?.score ?? 0),
      webAppSecurity:   Number(ratingData.risk_vectors?.web_application_headers?.grade_details?.score ?? 0),
      patchingCadence:  Number(ratingData.risk_vectors?.patching_cadence?.grade_details?.score ?? 0),
    },
    issues: Object.entries(ratingData.risk_vectors ?? {}).map(([key, val]: [string, any]) => ({
      category: key,
      severity: val.grade === 'A' ? 'low' : val.grade === 'B' ? 'medium' : 'high',
      count: Number(val.total_observations ?? 0),
    })),
  };
}


export async function fetchCyberRating(
  tenantId: string,
  vendorId: string,
  options?: { provider?: 'securityscorecard' | 'bitsight'; apiKey?: string },
): Promise<CyberRatingResult> {
  const schema = tenantSchema(tenantId);
  const vendorRes = await safeQuery(
    `SELECT vendor_id, COALESCE(domain, website, '') AS vendor_domain
     FROM "${schema}".vendors
     WHERE vendor_id = $1`,
    [vendorId],
  ).catch(() => ({ rows: [] as GenericRow[] }));

  const vendor = getFirstRow(vendorRes) as GenericRow | undefined;
  const vendorDomain = String(vendor?.vendor_domain ?? '');

  const provider = options?.provider ?? 'unconfigured';
  let partial: Partial<CyberRatingResult> = {};

  if (provider !== 'unconfigured' && options?.apiKey && vendorDomain) {
    if (provider === 'securityscorecard') {
      partial = await fetchFromSecurityScorecard(vendorDomain, options.apiKey);
    } else {
      partial = await fetchFromBitSight(vendorDomain, options.apiKey);
    }
  }

  const now = new Date();
  return {
    vendorId,
    vendorDomain,
    provider,
    overallScore: Number(partial.overallScore ?? 0),
    grade: String(partial.grade ?? 'N/A'),
    factors: partial.factors ?? {},
    issues: partial.issues ?? [],
    lastFetchedAt: now.toISOString(),
    nextFetchAt: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
  };
}

export async function bulkFetchCyberRatings(
  tenantId: string,
  options?: { provider?: 'securityscorecard' | 'bitsight'; apiKey?: string },
): Promise<{ processed: number; errors: number }> {
  const schema = tenantSchema(tenantId);
  const vendors = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT vendor_id FROM "${schema}".vendors
     WHERE status = 'active'
       AND (cyber_rating_fetched_at IS NULL OR cyber_rating_fetched_at < NOW() - INTERVAL '24 hours')`,
  ), { tenantId: tenantId, operation: 'query vendors' });

  let processed = 0;
  let errors = 0;
  for (const row of vendors.rows) {
    try {
      await fetchCyberRating(tenantId, (row as any).vendor_id, options);
      processed++;
    } catch {
      errors++;
    }
  }
  return { processed, errors };
}
