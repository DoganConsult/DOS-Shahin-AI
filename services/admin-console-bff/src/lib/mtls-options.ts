/**
 * DOS Master M15 D1 (C) — mTLS env hooks for the admin trust zone.
 *
 * STATUS: SCAFFOLD, ENFORCEMENT DISABLED BY DEFAULT (`MTLS_ENFORCE=0`).
 *
 * Doctrine binding:
 *   - Article 4: admin trust zone REQUIRES mTLS at the
 *     gateway → admin-console-bff hop. Until ops issues the CA + leaf
 *     certs, this scaffold ships disabled and behaviour matches the
 *     existing plain-HTTP loopback.
 *   - Article 5 (No fake-green): `MTLS_ENFORCE=1` MUST NOT be flipped on
 *     by automation; it requires an ops decision (CA authority + cert
 *     lifecycle policy + jurisdiction).
 *   - Article 7 (PPD): the `0 → 1` flip rides ring R0..R5 with health
 *     gates; rollback is automatic.
 *
 * Required env (only consulted when `MTLS_ENFORCE=1`):
 *   ADMIN_MTLS_CA    PEM bundle of trusted CAs (issuer + intermediates)
 *   ADMIN_MTLS_CERT  this service's leaf certificate (PEM)
 *   ADMIN_MTLS_KEY   this service's private key (PEM)
 *   MTLS_REJECT_UNAUTHORIZED  default '1' (strict)
 */
import { readFileSync, existsSync } from 'node:fs';

export interface MtlsConfig {
  enforce: boolean;
  caPath: string;
  certPath: string;
  keyPath: string;
  rejectUnauthorized: boolean;
}

export function mtlsConfig(): MtlsConfig {
  return {
    enforce:            String(process.env.MTLS_ENFORCE ?? '0').trim() === '1',
    caPath:             String(process.env.ADMIN_MTLS_CA ?? process.env.MTLS_CA_PATH ?? '').trim(),
    certPath:           String(process.env.ADMIN_MTLS_CERT ?? process.env.MTLS_CERT_PATH ?? '').trim(),
    keyPath:            String(process.env.ADMIN_MTLS_KEY ?? process.env.MTLS_KEY_PATH ?? '').trim(),
    rejectUnauthorized: String(process.env.MTLS_REJECT_UNAUTHORIZED ?? '1').trim() === '1',
  };
}

/**
 * Read PEM materials for an https.Server / Agent. Returns `null` when
 * enforcement is off OR any required path is missing — callers MUST fall
 * back to plain HTTP so the BFF never half-starts a broken mTLS listener.
 */
export function readMtlsMaterials(): {
  ca: Buffer;
  cert: Buffer;
  key: Buffer;
  rejectUnauthorized: boolean;
} | null {
  const cfg = mtlsConfig();
  if (!cfg.enforce) return null;
  if (!cfg.caPath || !cfg.certPath || !cfg.keyPath) return null;
  if (!existsSync(cfg.caPath) || !existsSync(cfg.certPath) || !existsSync(cfg.keyPath)) {
    return null;
  }
  try {
    return {
      ca:   readFileSync(cfg.caPath),
      cert: readFileSync(cfg.certPath),
      key:  readFileSync(cfg.keyPath),
      rejectUnauthorized: cfg.rejectUnauthorized,
    };
  } catch {
    return null;
  }
}

/**
 * Status string for /health and ledger surfaces.
 *   'off'              — MTLS_ENFORCE != 1
 *   'misconfigured'    — MTLS_ENFORCE=1 but CA/cert/key missing
 *   'enforcing'        — MTLS_ENFORCE=1 and all materials present
 */
export function mtlsStatus(): 'off' | 'misconfigured' | 'enforcing' {
  const cfg = mtlsConfig();
  if (!cfg.enforce) return 'off';
  return readMtlsMaterials() ? 'enforcing' : 'misconfigured';
}
