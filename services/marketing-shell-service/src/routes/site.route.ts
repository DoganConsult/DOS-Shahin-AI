import { Router, type Request, type Response } from 'express';
import { listMarketingRoutes, brandTokensFor } from '../lib/marketing-repo.js';

export const siteRouter = Router();

/**
 * GET /api/public/site-bootstrap?product=shahin-ai
 *
 * Doctrine Article 4 (public trust zone). Returns the public marketing
 * surface contract: route catalog (from `dos.ui_route_template_binding`
 * where archetype='marketing-landing') + brand tokens/assets for the
 * requested product. Cacheable at the CDN edge (Cloudflare default;
 * `CdnAdapter` for on-prem in M9 D2).
 */
siteRouter.get('/site-bootstrap', async (req: Request, res: Response) => {
  const product = String(req.query.product ?? 'shahin-ai');
  try {
    const [routes, brand] = await Promise.all([
      listMarketingRoutes(),
      brandTokensFor(product),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.setHeader('Vary', 'Accept-Language');
    res.json({
      product,
      cdn: process.env.MARKETING_CDN ?? 'cloudflare',
      routes,
      brand,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'site_bootstrap_failed', detail: String((err as Error).message) });
  }
});
