/**
 * Native TokenVerifier — wraps the existing jsonwebtoken HS256 flow in
 * `identity/token.service.ts#verifyAccessToken`. This is the default and is
 * always available — Keycloak and other external verifiers run beside it in
 * shadow mode before any enforce flip.
 */
import * as jwt from 'jsonwebtoken';
import type { AuthPayload } from '../../identity/token.service';
import { getJwtSecret } from '../../identity/token.service';
import { InvalidTokenError, type TokenVerifier, type TokenVerifyResult } from '../../ports/token-verifier.port';

export class NativeTokenVerifier implements TokenVerifier {
  readonly name = 'native' as const;

  async verify(token: string): Promise<TokenVerifyResult> {
    try {
      const payload = jwt.verify(token, getJwtSecret()) as AuthPayload;
      return { payload, source: 'native' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('expired')) {
        throw new InvalidTokenError(msg, 'EXPIRED', 'native');
      }
      if (msg.toLowerCase().includes('signature')) {
        throw new InvalidTokenError(msg, 'SIGNATURE', 'native');
      }
      if (msg.toLowerCase().includes('malformed') || msg.toLowerCase().includes('invalid')) {
        throw new InvalidTokenError(msg, 'MALFORMED', 'native');
      }
      throw new InvalidTokenError(msg, 'UNKNOWN', 'native');
    }
  }
}

export const nativeTokenVerifier = new NativeTokenVerifier();
