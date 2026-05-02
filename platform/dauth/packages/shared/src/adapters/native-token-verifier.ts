/**
 * Native TokenVerifier — injectable wrapper. The consumer project supplies
 * the actual verify function (typically a closure over its jsonwebtoken or
 * jose call) and this adapter simply exposes it through the port contract.
 *
 * Why injection rather than embedding the verify logic here:
 * - Different projects use different JWT libraries (`jsonwebtoken` vs `jose`).
 * - Different projects have different key-resolution strategies (env JWT_SECRET,
 *   DB-backed kid rotation, Keycloak JWKS).
 * - By keeping this adapter library-agnostic, @dos/auth stays the canonical
 *   port without forcing every consumer onto one JWT library.
 *
 * The NativeTokenVerifier produced here guarantees only two invariants:
 *   1. Given a valid token accepted by the injected verify fn, the returned
 *      payload is the same object the injected fn produced.
 *   2. Given an invalid token, the adapter throws InvalidTokenError with a
 *      source tag of 'native'. The original error message is preserved.
 */
import {
  InvalidTokenError,
  type MinimalAuthPayload,
  type TokenVerifier,
  type TokenVerifyResult,
} from '../dauth-ports/token-verifier.port';

export type NativeVerifyFn<P extends MinimalAuthPayload> =
  | ((token: string) => P)
  | ((token: string) => Promise<P>);

export interface NativeTokenVerifierOptions {
  /** Optional hook invoked with the raw error so consumers can map to codes. */
  mapErrorCode?: (err: unknown) => InvalidTokenError['code'];
}

export class NativeTokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload>
  implements TokenVerifier<P>
{
  readonly name = 'native' as const;

  constructor(
    private readonly verifyFn: NativeVerifyFn<P>,
    private readonly options: NativeTokenVerifierOptions = {},
  ) {}

  async verify(token: string): Promise<TokenVerifyResult<P>> {
    try {
      const maybePromise = this.verifyFn(token);
      const payload = (maybePromise instanceof Promise
        ? await maybePromise
        : maybePromise) as P;
      return { payload, source: 'native' };
    } catch (err) {
      const code = this.options.mapErrorCode
        ? this.options.mapErrorCode(err)
        : defaultMapErrorCode(err);
      const msg = err instanceof Error ? err.message : String(err);
      throw new InvalidTokenError(msg, code, 'native');
    }
  }
}

function defaultMapErrorCode(err: unknown): InvalidTokenError['code'] {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('expired')) return 'EXPIRED';
  if (msg.includes('signature')) return 'SIGNATURE';
  if (msg.includes('audience')) return 'AUDIENCE';
  if (msg.includes('issuer')) return 'ISSUER';
  if (msg.includes('malformed') || msg.includes('invalid') || msg.includes('jwt')) return 'MALFORMED';
  return 'UNKNOWN';
}
