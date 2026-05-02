import type { TokenVerifier } from '../ports/token-verifier.port';
export interface VerifierStack {
    primary: TokenVerifier;
    shadow?: TokenVerifier;
}
export declare function getTokenVerifiers(): VerifierStack;
/** Reset factory cache — for tests and hot config reloads. */
export declare function resetTokenVerifierFactory(): void;
