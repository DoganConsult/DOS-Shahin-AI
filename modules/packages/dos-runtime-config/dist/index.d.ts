import { z } from 'zod';
export declare const ServiceRuntimeConfigSchema: z.ZodObject<{
    serviceCode: z.ZodString;
    port: z.ZodNumber;
    nodeEnv: z.ZodEnum<{
        development: "development";
        production: "production";
        staging: "staging";
        test: "test";
    }>;
    logLevel: z.ZodEnum<{
        error: "error";
        trace: "trace";
        debug: "debug";
        info: "info";
        warn: "warn";
        fatal: "fatal";
        silent: "silent";
    }>;
    db: z.ZodObject<{
        connectionString: z.ZodString;
        poolMax: z.ZodNumber;
        ssl: z.ZodBoolean;
    }, z.core.$strip>;
    redis: z.ZodObject<{
        url: z.ZodString;
        prefix: z.ZodString;
    }, z.core.$strip>;
    services: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip>;
export type ServiceRuntimeConfig = z.infer<typeof ServiceRuntimeConfigSchema>;
export declare class ConfigValidationError extends Error {
    readonly issues: ConfigIssue[];
    constructor(serviceCode: string, issues: ConfigIssue[]);
}
export interface ConfigIssue {
    field: string;
    message: string;
    value?: unknown;
}
declare function required(key: string): string;
declare function optional(key: string, fallback: string): string;
declare function optionalInt(key: string, fallback: number): number;
declare function optionalBool(key: string, fallback: boolean): boolean;
export interface LoadConfigOptions {
    skipValidation?: boolean;
    overrides?: Partial<ServiceRuntimeConfig>;
    additionalServices?: Record<string, {
        envVar: string;
        defaultUrl: string;
    }>;
}
export declare function loadServiceConfig(serviceCode: string, options?: LoadConfigOptions): ServiceRuntimeConfig;
export declare function loadDbConfigOverlay(serviceCode: string): Promise<{
    loaded: number;
    skipped: number;
}>;
/**
 * Journey / onboarding feature flags (Phase 0.6).
 * Loaded from process.env; no silent fallbacks beyond documented defaults.
 */
export interface JourneyFeatureFlags {
    /** When true, complete-onboarding requires verified email (409 otherwise). */
    onboardingRequireEmailVerified: boolean;
    /** When false, email verification is disabled and users are auto-verified at registration time. */
    onboardingEmailVerificationEnabled: boolean;
    /** When true, public register requires CAPTCHA verification (Phase 7). */
    captchaRequired: boolean;
    /** When false, provisioning worker is disabled (register still creates tenant row). */
    provisioningWorkerEnabled: boolean;
    /**
     * When true (default), Shahin-AI shows the Foundation Intake (one-form) flow
     * at /onboarding/session/:sessionId/questions and hides the legacy 18-stage
     * stepper. The legacy components remain in code; setting this to false
     * restores the prior multi-stage UI.
     */
    foundationIntakeOnly: boolean;
}
export declare function getJourneyFeatureFlags(): JourneyFeatureFlags;
export { required, optional, optionalInt, optionalBool };
//# sourceMappingURL=index.d.ts.map