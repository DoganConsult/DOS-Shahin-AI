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
import { InvalidTokenError, type MinimalAuthPayload, type TokenVerifier, type TokenVerifyResult } from '../dauth-ports/token-verifier.port';
export type NativeVerifyFn<P extends MinimalAuthPayload> = ((token: string) => P) | ((token: string) => Promise<P>);
export interface NativeTokenVerifierOptions {
    /** Optional hook invoked with the raw error so consumers can map to codes. */
    mapErrorCode?: (err: unknown) => InvalidTokenError['code'];
}
export declare class NativeTokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload> implements TokenVerifier<P> {
    private readonly verifyFn;
    private readonly options;
    readonly name: "native";
    constructor(verifyFn: NativeVerifyFn<P>, options?: NativeTokenVerifierOptions);
    verify(token: string): Promise<TokenVerifyResult<P>>;
}
