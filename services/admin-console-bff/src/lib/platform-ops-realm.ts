import type { Request, Response, NextFunction } from 'express';

export interface PlatformOpsRealmConfig {
  enforce: boolean;
  realm: string;
  issuer: string;
  jwksUrl: string;
  audience: string;
}

export function loadPlatformOpsRealmConfig(): PlatformOpsRealmConfig {
  return {
    enforce: (process.env.KC_REQUIRE ?? '0') === '1',
    realm: process.env.KC_REALM ?? 'platform-ops',
    issuer: process.env.KC_ISSUER ?? '',
    jwksUrl: process.env.KC_JWKS_URL ?? '',
    audience: process.env.KC_AUDIENCE ?? 'admin-console-bff',
  };
}

export function platformOpsRealmGuard(cfg: PlatformOpsRealmConfig) {
  return function platformOpsGuard(req: Request, res: Response, next: NextFunction): void {
    if (!cfg.enforce) {
      next();
      return;
    }
    if (!cfg.issuer || !cfg.jwksUrl) {
      res.status(503).json({
        error: 'platform-ops-realm-unconfigured',
        message: 'KC_REQUIRE=1 set but KC_ISSUER/KC_JWKS_URL missing — ops must provision realm before enabling enforcement.',
      });
      return;
    }
    const auth = req.header('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      res.status(401).json({ error: 'missing-bearer-token', realm: cfg.realm });
      return;
    }
    res.status(501).json({
      error: 'kc-jwt-verification-not-implemented',
      message: 'JWKS verification stub — wire jose.createRemoteJWKSet against KC_JWKS_URL once realm is live.',
      realm: cfg.realm,
      issuer: cfg.issuer,
    });
  };
}
