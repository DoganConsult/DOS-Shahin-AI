import { type Client, type EvaluationContext } from '@openfeature/server-sdk';
export declare function initFeatureFlags(serviceCode: string): Promise<Client | null>;
export declare function getClient(): Client | null;
export declare function getFlag<T>(key: string, defaultValue: T, ctx?: EvaluationContext): Promise<T>;
export declare const getFlagBool: (key: string, def?: boolean, ctx?: EvaluationContext) => Promise<boolean>;
export declare const getFlagString: (key: string, def?: string, ctx?: EvaluationContext) => Promise<string>;
//# sourceMappingURL=feature-flags.d.ts.map