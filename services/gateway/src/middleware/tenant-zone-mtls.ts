/**
 * DOS Master L34 (Phase 4) — gateway → tenant-zone mTLS hook.
 *
 * Doctrine binding: Article 4 (separate trust authority per zone — admin
 * CA MUST NOT chain tenant-zone services). When ops mints the tenant CA
 * + leaf certs and flips TENANT_MTLS_ENFORCE=1, this returns a tenant-
 * scoped HttpsAgent; otherwise null and the caller falls back to plain
 * HTTP (Article 5: never half-start a broken mTLS upstream).
 *
 * Required env (only consulted when TENANT_MTLS_ENFORCE=1):
 *   TENANT_MTLS_CA              PEM bundle (tenant CA + intermediates)
 *   TENANT_MTLS_GATEWAY_CERT    this gateway's tenant-zone leaf cert
 *   TENANT_MTLS_GATEWAY_KEY     this gateway's tenant-zone private key
 *   TENANT_MTLS_REJECT_UNAUTHORIZED default '1'
 */
import { readFileSync, existsSync } from 'node:fs';
import { Agent as HttpsAgent } from 'node:https';

export function tenantZoneMtlsAgent(): HttpsAgent | null {
  if (String(process.env.TENANT_MTLS_ENFORCE ?? '0').trim() !== '1') return null;
  const ca   = String(process.env.TENANT_MTLS_CA            ?? '').trim();
  const cert = String(process.env.TENANT_MTLS_GATEWAY_CERT  ?? '').trim();
  const key  = String(process.env.TENANT_MTLS_GATEWAY_KEY   ?? '').trim();
  if (!ca || !cert || !key) return null;
  if (!existsSync(ca) || !existsSync(cert) || !existsSync(key)) return null;
  try {
    return new HttpsAgent({
      ca:   readFileSync(ca),
      cert: readFileSync(cert),
      key:  readFileSync(key),
      rejectUnauthorized: String(process.env.TENANT_MTLS_REJECT_UNAUTHORIZED ?? '1').trim() === '1',
      keepAlive: true,
    });
  } catch {
    return null;
  }
}

export function tenantZoneMtlsStatus(): 'off' | 'misconfigured' | 'enforcing' {
  if (String(process.env.TENANT_MTLS_ENFORCE ?? '0').trim() !== '1') return 'off';
  return tenantZoneMtlsAgent() ? 'enforcing' : 'misconfigured';
}
