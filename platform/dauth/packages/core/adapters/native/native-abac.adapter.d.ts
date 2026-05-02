import type { AbacAdapter, AbacRequest, AbacVerdict } from '../../ports/abac.port';
export declare class NativeAbacAdapter implements AbacAdapter {
    readonly name: "native";
    evaluate(request: AbacRequest): Promise<AbacVerdict>;
    currentPolicyVersion(): Promise<string>;
}
export declare const nativeAbacAdapter: NativeAbacAdapter;
