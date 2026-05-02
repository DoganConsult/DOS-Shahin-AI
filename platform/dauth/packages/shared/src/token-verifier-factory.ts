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
import { NativeTokenVerifier, type NativeVerifyFn } from './adapters/native-token-verifier';

export interface TokenVerifierStack<P extends MinimalAuthPayload = MinimalAuthPayload> {
  primary: TokenVerifier<P>;
  shadow?: TokenVerifier<P>;
}

interface FactoryState<P extends MinimalAuthPayload> {
  native: NativeTokenVerifier<P> | null;
  keycloak: TokenVerifier<P> | null;
  cached: TokenVerifierStack<P> | null;
}

const state: FactoryState<MinimalAuthPayload> = {
  native: null,
  keycloak: null,
  cached: null,
};

export interface InitTokenVerifierFactoryOptions<P extends MinimalAuthPayload> {
  /** The project's native verify function (closure over its own JWT path). */
  nativeVerify: NativeVerifyFn<P>;
}

export function initTokenVerifierFactory<P extends MinimalAuthPayload>(
  opts: InitTokenVerifierFactoryOptions<P>,
): void {
  // TS note: we store one shared state keyed on MinimalAuthPayload; a per-P
  // typed cast at the boundary is safe because the factory never inspects
  // the extra fields.
  state.native = new NativeTokenVerifier<P>(opts.nativeVerify) as unknown as NativeTokenVerifier<MinimalAuthPayload>;
  state.keycloak = null;
  state.cached = null;
}

export function registerKeycloakVerifier<P extends MinimalAuthPayload>(
  verifier: TokenVerifier<P>,
): void {
  state.keycloak = verifier as unknown as TokenVerifier<MinimalAuthPayload>;
  state.cached = null;
}

export function getTokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload>():
  TokenVerifierStack<P>
{
  if (state.cached) return state.cached as unknown as TokenVerifierStack<P>;
  if (!state.native) {
    throw new Error(
      '[@dos/auth] initTokenVerifierFactory() must be called before getTokenVerifier(). ' +
      'Wire it at bootstrap with the project\'s native verify function.',
    );
  }

  const shadow = readBool('DAUTH_KEYCLOAK_SHADOW');
  const enforce = readBool('DAUTH_KEYCLOAK_ENFORCE');

  let stack: TokenVerifierStack<MinimalAuthPayload>;
  if (enforce && state.keycloak) {
    stack = { primary: state.keycloak, shadow: shadow ? state.native : undefined };
  } else if (shadow && state.keycloak) {
    stack = { primary: state.native, shadow: state.keycloak };
  } else {
    // No Keycloak adapter, or flags off — native only. No external engine is
    // invoked, no JWKS fetch is attempted. This is the rollback state.
    stack = { primary: state.native };
  }
  state.cached = stack;
  return stack as unknown as TokenVerifierStack<P>;
}

export function resetTokenVerifierFactory(): void {
  state.native = null;
  state.keycloak = null;
  state.cached = null;
}

function readBool(key: string): boolean {
  const v = process.env[key];
  if (!v) return false;
  return v === '1' || v.toLowerCase() === 'true';
}
