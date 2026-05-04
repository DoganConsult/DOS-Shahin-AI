import { CompactEncrypt, compactDecrypt } from 'jose';

const ENC = 'A256GCM';
const ALG = 'dir';

function getKey(): Uint8Array {
  const raw = process.env.WORKSPACE_BOOTSTRAP_JWE_KEY;
  if (!raw) {
    throw new Error('WORKSPACE_BOOTSTRAP_JWE_KEY missing (32 bytes base64url required)');
  }
  const buf = Buffer.from(raw, 'base64url');
  if (buf.length !== 32) {
    throw new Error(`WORKSPACE_BOOTSTRAP_JWE_KEY must decode to 32 bytes (got ${buf.length})`);
  }
  return new Uint8Array(buf);
}

export async function encryptBootstrap(payload: unknown): Promise<string> {
  const key = getKey();
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return await new CompactEncrypt(json)
    .setProtectedHeader({ alg: ALG, enc: ENC, typ: 'JWE', cty: 'application/json' })
    .encrypt(key);
}

export async function decryptBootstrap<T = unknown>(jwe: string): Promise<T> {
  const key = getKey();
  const { plaintext } = await compactDecrypt(jwe, key);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
