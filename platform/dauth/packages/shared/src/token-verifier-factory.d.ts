/**
 * TokenVerifier factory for services/auth-service runtime.
 *
 * Contract:
 * - Consumer supplies a native verify function at bootstrap via
 *   `initTokenVerifierFactory({ nativeVerify })`. The factory never reaches
 *   into the consumer's internals; the injection is explicit.
 * - At request time, `getTokenVerifier()` returns a `{ primary, shadow? }`
 *   pair based on `DAUTH_KEYCLOAK_SHADOW` / `DAUTH_KEYCLOAK_ENFORCE`.
 * - When neither flag is set, primary = NativeTokenVerifier. No external
 *   engine is constructed; no imports reach for Keycloak libs.
 * - When a Keycloak verifier is supplied (Part 7 work), it can be registered
 *   via `registerKeycloakVerifier()`. Until then the factory silently falls
 *   back to native.
 *
 * Rollback: unsetting the flags restores native. No data migration needed.
 */
import type { MinimalAuthPayload, TokenVerifier } from './dauth-ports/token-verifier.port';
import { type NativeVerifyFn } from './adapters/native-token-verifier';
export interface TokenVerifierStack<P extends MinimalAuthPayload = MinimalAuthPayload> {
    primary: TokenVerifier<P>;
    shadow?: TokenVerifier<P>;
}
export interface InitTokenVerifierFactoryOptions<P extends MinimalAuthPayload> {
    /** The project's native verify function (closure over its own JWT path). */
    nativeVerify: NativeVerifyFn<P>;
}
export declare function initTokenVerifierFactory<P extends MinimalAuthPayload>(opts: InitTokenVerifierFactoryOptions<P>): void;
export declare function registerKeycloakVerifier<P extends MinimalAuthPayload>(verifier: TokenVerifier<P>): void;
export declare function getTokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload>(): TokenVerifierStack<P>;
export declare function resetTokenVerifierFactory(): void;
