import { type TokenVerifier, type TokenVerifyResult } from '../../ports/token-verifier.port';
export declare class NativeTokenVerifier implements TokenVerifier {
    readonly name: "native";
    verify(token: string): Promise<TokenVerifyResult>;
}
export declare const nativeTokenVerifier: NativeTokenVerifier;
