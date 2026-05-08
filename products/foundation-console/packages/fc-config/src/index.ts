// @fc/config — typed env loader. Reads FC_* env once, validates, exposes typed config.
// Doctrine: zero hardcoded values. Every value comes from env. Missing required = boot fail.

export interface FcConfig {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly logLevel: string;
  readonly gateway: { port: number; url: string };
  readonly uiOs: { port: number; url: string };
  readonly dynamicUi: { port: number; url: string };
  readonly db: { url: string; schemas: readonly string[] };
  readonly oidc: {
    issuerUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  readonly session: { cookieName: string; cookieDomain: string; secret: string };
  readonly publicTenantId: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`[fc-config] Missing required env: ${name}`);
  }
  return v;
}
function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}
function int(name: string): number {
  const raw = required(name);
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`[fc-config] Env ${name} must be int, got "${raw}"`);
  return n;
}

export function loadFcConfig(): FcConfig {
  const nodeEnv = optional('NODE_ENV', 'development') as FcConfig['nodeEnv'];
  return Object.freeze({
    nodeEnv,
    logLevel: optional('FC_LOG_LEVEL', 'info'),
    gateway:   { port: int('FC_GATEWAY_PORT'),    url: required('FC_GATEWAY_URL') },
    uiOs:      { port: int('FC_UI_OS_PORT'),      url: required('FC_UI_OS_URL') },
    dynamicUi: { port: int('FC_DYNAMIC_UI_PORT'), url: required('FC_DYNAMIC_UI_URL') },
    db: {
      url: required('FC_DB_URL'),
      schemas: Object.freeze(required('FC_DB_SCHEMAS').split(',').map((s) => s.trim())),
    },
    oidc: {
      issuerUrl:    required('FC_OIDC_ISSUER_URL'),
      realm:        required('FC_OIDC_REALM'),
      clientId:     required('FC_OIDC_CLIENT_ID'),
      clientSecret: optional('FC_OIDC_CLIENT_SECRET', ''),
      redirectUri:  required('FC_OIDC_REDIRECT_URI'),
    },
    session: {
      cookieName:   optional('FC_SESSION_COOKIE_NAME', 'fc_sid'),
      cookieDomain: optional('FC_SESSION_COOKIE_DOMAIN', 'localhost'),
      secret:       required('FC_SESSION_SECRET'),
    },
    publicTenantId: required('FC_PUBLIC_TENANT_ID'),
  });
}
