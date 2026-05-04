import { masterQuery } from '@dos/db/master';

export interface MarketingRoute {
  route: string;
  archetype: string;
  titleEn: string | null;
  titleAr: string | null;
}

export async function listMarketingRoutes(): Promise<MarketingRoute[]> {
  const r = await masterQuery(
    `SELECT route, archetype, title_en, title_ar
       FROM dos.ui_route_template_binding
      WHERE archetype = 'marketing-landing'
      ORDER BY CASE WHEN route='/' THEN 0 ELSE 1 END, route`,
  );
  return r.rows.map((row: Record<string, unknown>) => ({
    route: String(row.route),
    archetype: String(row.archetype),
    titleEn: row.title_en == null ? null : String(row.title_en),
    titleAr: row.title_ar == null ? null : String(row.title_ar),
  }));
}

export interface BrandTokens {
  productCode: string;
  tokens: Record<string, unknown>;
  assets: Record<string, unknown>;
}

export async function brandTokensFor(productCode: string): Promise<BrandTokens> {
  const tokenRow = await masterQuery(
    `SELECT tokens FROM dos.marketing_brand_tokens WHERE product_code = $1 LIMIT 1`,
    [productCode],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }));
  const assetRow = await masterQuery(
    `SELECT assets FROM dos.marketing_brand_assets WHERE product_code = $1 LIMIT 1`,
    [productCode],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }));
  return {
    productCode,
    tokens: (tokenRow.rows[0]?.tokens as Record<string, unknown>) ?? {},
    assets: (assetRow.rows[0]?.assets as Record<string, unknown>) ?? {},
  };
}
