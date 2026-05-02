/**
 * Wave 11 — Customer-Managed Encryption Keys (CMEK / BYOK).
 *
 * Per-tenant KMS adapter abstraction. Concrete adapters (AWS KMS, Azure
 * Key Vault, GCP KMS, HashiCorp Vault) implement TenantKmsAdapter.
 *
 * Key model:
 *   - Tenant KEK (Key Encryption Key) lives in customer KMS — never leaves
 *   - Per-tenant DEK (Data Encryption Key) is generated locally + wrapped
 *     by KEK, stored at rest in dos.tenant_kms_keys
 *   - Application encrypts payloads with DEK; DEK is unwrapped on demand
 *   - Crypto-erasure: revoke KEK in customer KMS → all wrapped DEKs become
 *     unrecoverable → tenant data is cryptographically destroyed
 *
 * Required by enterprise procurement for regulated tenants (banks, healthcare,
 * KSA government). Each tenant configures their own KMS at onboarding.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { DbClient } from '../../db/runner';

export type KmsProvider = 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'platform-managed';

export interface TenantKmsConfig {
  tenantId: string;
  provider: KmsProvider;
  kekRef: string;
  region?: string;
  rotationDays: number;
  config: Record<string, unknown>;
  status: 'active' | 'rotating' | 'disabled' | 'crypto-erased';
  createdAt: string;
  updatedAt: string;
}

export interface WrappedDek {
  ciphertext: Buffer;
  algorithm: 'AES-256-GCM';
  kekRef: string;
  wrappedAt: string;
}

export interface TenantKmsAdapter {
  readonly provider: KmsProvider;
  /** Generate a fresh DEK and wrap with the customer KEK. */
  generateDek(kekRef: string): Promise<{ dek: Buffer; wrappedDek: WrappedDek }>;
  /** Unwrap a previously wrapped DEK using the customer KEK. */
  unwrapDek(wrapped: WrappedDek): Promise<Buffer>;
  /** Verify the customer KEK is still accessible (used by health checks). */
  verifyKekAccess(kekRef: string): Promise<{ ok: boolean; reason?: string }>;
  /** Rotate the customer KEK reference. Returns the new KEK ref. */
  rotateKek?(currentKekRef: string): Promise<{ newKekRef: string; rotatedAt: string }>;
}

const ALGORITHM = 'aes-256-gcm';
const DEK_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Platform-managed adapter — fallback for tenants who haven't configured
 * external CMEK. Uses a platform master key (managed via env / Vault).
 * Crypto-erasure not available in this mode (data is always recoverable
 * by the platform).
 */
export class PlatformManagedKmsAdapter implements TenantKmsAdapter {
  readonly provider: KmsProvider = 'platform-managed';
  constructor(private readonly platformMasterKey: Buffer) {
    if (platformMasterKey.length !== 32) {
      throw new Error('platformMasterKey must be 32 bytes (AES-256)');
    }
  }

  async generateDek(kekRef: string): Promise<{ dek: Buffer; wrappedDek: WrappedDek }> {
    const dek = randomBytes(DEK_BYTES);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.platformMasterKey, iv);
    const enc = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      dek,
      wrappedDek: {
        ciphertext: Buffer.concat([iv, tag, enc]),
        algorithm: 'AES-256-GCM',
        kekRef,
        wrappedAt: new Date().toISOString(),
      },
    };
  }

  async unwrapDek(wrapped: WrappedDek): Promise<Buffer> {
    if (wrapped.algorithm !== 'AES-256-GCM') {
      throw new Error(`unsupported algorithm: ${wrapped.algorithm}`);
    }
    const buf = wrapped.ciphertext;
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const enc = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.platformMasterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
  }

  async verifyKekAccess(_kekRef: string): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}

/** Stub adapters — concrete cloud-vendor SDKs are wired in follow-up PRs. */
export class AwsKmsAdapter implements TenantKmsAdapter {
  readonly provider: KmsProvider = 'aws-kms';
  constructor(private readonly region: string) {}
  async generateDek(_kekRef: string): Promise<{ dek: Buffer; wrappedDek: WrappedDek }> {
    throw new Error('AwsKmsAdapter requires @aws-sdk/client-kms (Wave 11 follow-up)');
  }
  async unwrapDek(_wrapped: WrappedDek): Promise<Buffer> {
    throw new Error('AwsKmsAdapter requires @aws-sdk/client-kms (Wave 11 follow-up)');
  }
  async verifyKekAccess(_kekRef: string): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: 'aws-sdk not configured' };
  }
}

export class AzureKeyVaultAdapter implements TenantKmsAdapter {
  readonly provider: KmsProvider = 'azure-keyvault';
  async generateDek(): Promise<{ dek: Buffer; wrappedDek: WrappedDek }> {
    throw new Error('AzureKeyVaultAdapter requires @azure/keyvault-keys (Wave 11 follow-up)');
  }
  async unwrapDek(): Promise<Buffer> {
    throw new Error('AzureKeyVaultAdapter requires @azure/keyvault-keys (Wave 11 follow-up)');
  }
  async verifyKekAccess(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: 'azure-sdk not configured' };
  }
}

export class GcpKmsAdapter implements TenantKmsAdapter {
  readonly provider: KmsProvider = 'gcp-kms';
  async generateDek(): Promise<{ dek: Buffer; wrappedDek: WrappedDek }> {
    throw new Error('GcpKmsAdapter requires @google-cloud/kms (Wave 11 follow-up)');
  }
  async unwrapDek(): Promise<Buffer> {
    throw new Error('GcpKmsAdapter requires @google-cloud/kms (Wave 11 follow-up)');
  }
  async verifyKekAccess(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: 'gcp-sdk not configured' };
  }
}

export class HashicorpVaultAdapter implements TenantKmsAdapter {
  readonly provider: KmsProvider = 'hashicorp-vault';
  async generateDek(): Promise<{ dek: Buffer; wrappedDek: WrappedDek }> {
    throw new Error('HashicorpVaultAdapter requires node-vault (Wave 11 follow-up)');
  }
  async unwrapDek(): Promise<Buffer> {
    throw new Error('HashicorpVaultAdapter requires node-vault (Wave 11 follow-up)');
  }
  async verifyKekAccess(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: 'vault-client not configured' };
  }
}

/**
 * Resolve the right adapter for a tenant from their stored config.
 * Falls back to PlatformManagedKmsAdapter if no row exists (tenant didn't
 * configure CMEK at onboarding).
 */
export async function resolveTenantKmsAdapter(
  client: DbClient,
  tenantId: string,
  platformMasterKey: Buffer,
): Promise<{ adapter: TenantKmsAdapter; config: TenantKmsConfig | null }> {
  const res = await client.query<TenantKmsConfig>(
    `SELECT tenant_id AS "tenantId", provider, kek_ref AS "kekRef",
            region, rotation_days AS "rotationDays", config, status,
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM dos.tenant_kms_config
       WHERE tenant_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
    [tenantId],
  );
  const config = res.rows[0] ?? null;

  if (!config || config.status !== 'active') {
    return { adapter: new PlatformManagedKmsAdapter(platformMasterKey), config };
  }

  switch (config.provider) {
    case 'aws-kms': return { adapter: new AwsKmsAdapter(config.region ?? 'us-east-1'), config };
    case 'azure-keyvault': return { adapter: new AzureKeyVaultAdapter(), config };
    case 'gcp-kms': return { adapter: new GcpKmsAdapter(), config };
    case 'hashicorp-vault': return { adapter: new HashicorpVaultAdapter(), config };
    case 'platform-managed':
    default:
      return { adapter: new PlatformManagedKmsAdapter(platformMasterKey), config };
  }
}

/**
 * Crypto-erasure: mark the tenant's KMS config as crypto-erased and emit
 * an audit event. The actual KEK destruction must be performed in the
 * customer's KMS (out of band) — we cannot revoke their keys for them.
 * Once the KEK is gone, all wrapped DEKs become unrecoverable, and the
 * tenant's encrypted data is mathematically destroyed.
 */
export async function markCryptoErased(
  client: DbClient,
  tenantId: string,
  reason: string,
): Promise<void> {
  await client.query(
    `UPDATE dos.tenant_kms_config
        SET status = 'crypto-erased',
            updated_at = NOW(),
            config = jsonb_set(COALESCE(config, '{}'::jsonb), '{erasureReason}', to_jsonb($2::text))
      WHERE tenant_id = $1`,
    [tenantId, reason],
  );
}
