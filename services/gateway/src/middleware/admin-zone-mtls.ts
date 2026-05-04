/**
 * DOS Master M15 D1 (C) — gateway → admin-console-bff mTLS hook (scaffold).
 *
 * STATUS: SCAFFOLD, ENFORCEMENT DISABLED BY DEFAULT (`MTLS_ENFORCE=0`).
 *
 * Doctrine binding:
 *   - Article 4: admin trust zone REQUIRES mTLS at the
 *     gateway → admin-console-bff hop. Until ops issues the CA + leaf
 *     certs, this scaffold ships disabled and the existing
 *     `http-proxy-middleware` hits :4013 over plain HTTP loopback.
 *   - Article 5 (No fake-green): `MTLS_ENFORCE=1` MUST NOT be flipped on
 *     by automation; it requires an ops decision (CA authority + cert
 *     lifecycle policy + jurisdiction).
 *   - Article 7 (PPD): the `0 → 1` flip rides ring R0..R5 with health
 *     gates; rollback is automatic.
 *
 * Required env (only consulted when `MTLS_ENFORCE=1`):
 *   ADMIN_MTLS_CA            PEM bundle of trusted CAs (issuer + intermediates)
 *   ADMIN_MTLS_GATEWAY_CERT  this gateway's leaf certificate (PEM)
 *   ADMIN_MTLS_GATEWAY_KEY   this gateway's private key (PEM)
 *   MTLS_REJECT_UNAUTHORIZED default '1' (strict)
 *
 * Returns `null` when enforcement is off OR materials are missing — the
 * caller MUST fall back to the existing plain-HTTP proxy options so the
 * gateway never half-starts a broken mTLS upstream.
 */
import { readFileSync, existsSync } from 'node:fs';
import { Agent as HttpsAgent } from 'node:https';

export interface AdminZoneMtlsConfig {
  enforce: boolean;
  caPath: string;
  certPath: string;
  keyPath: string;
  rejectUnauthorized: boolean;
}

export function adminZoneMtlsConfig(): AdminZoneMtlsConfig {
  return {
    enforce:            String(process.env.MTLS_ENFORCE ?? '0').trim() === '1',
    caPath:             String(process.env.ADMIN_MTLS_CA ?? '').trim(),
    certPath:           String(process.env.ADMIN_MTLS_GATEWAY_CERT ?? process.env.ADMIN_MTLS_CERT ?? '').trim(),
    keyPath:            String(process.env.ADMIN_MTLS_GATEWAY_KEY ?? process.env.ADMIN_MTLS_KEY ?? '').trim(),
    rejectUnauthorized: String(process.env.MTLS_REJECT_UNAUTHORIZED ?? '1').trim() === '1',
  };
}

export function adminZoneMtlsAgent(): HttpsAgent | null {
  const cfg = adminZoneMtlsConfig();
  if (!cfg.enforce) return null;
  if (!cfg.caPath || !cfg.certPath || !cfg.keyPath) return null;
  if (!existsSync(cfg.caPath) || !existsSync(cfg.certPath) || !existsSync(cfg.keyPath)) {
    return null;
  }
  try {
    return new HttpsAgent({
      ca:   readFileSync(cfg.caPath),
      cert: readFileSync(cfg.certPath),
      key:  readFileSync(cfg.keyPath),
      rejectUnauthorized: cfg.rejectUnauthorized,
      keepAlive: true,
    });
  } catch {
    return null;
  }
}

export function adminZoneMtlsStatus(): 'off' | 'misconfigured' | 'enforcing' {
  const cfg = adminZoneMtlsConfig();
  if (!cfg.enforce) return 'off';
  return adminZoneMtlsAgent() ? 'enforcing' : 'misconfigured';
}
