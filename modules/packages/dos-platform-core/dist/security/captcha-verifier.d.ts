/**
 * Pluggable CAPTCHA verifier — self-hosted SVG (default), Turnstile, hCaptcha, reCAPTCHA-v3.
 *
 * The default provider (`svg-self-hosted`) uses the Redis-backed, in-house SVG
 * challenge shipped in captcha-svg.service.ts. External providers (Turnstile,
 * hCaptcha, reCAPTCHA) are still supported for customers who prefer them —
 * select via `CAPTCHA_PROVIDER` env. External providers all share the same
 * POST /verify contract with `secret` + `response` fields, normalised here.
 *
 * Configuration (env):
 *   CAPTCHA_PROVIDER     one of "svg-self-hosted" | "turnstile" | "hcaptcha" | "recaptcha" (default "svg-self-hosted")
 *   CAPTCHA_SECRET       server-side verifier secret (required for external providers)
 *   CAPTCHA_TIMEOUT_MS   external-verifier HTTP timeout (default 3000)
 *   CAPTCHA_DEV_BYPASS   if "true" AND NODE_ENV !== "production", bypasses verify
 *
 * Fail-closed in production — missing secret, HTTP failure, or Redis outage
 * all return `success: false`.
 */
import type { Redis } from 'ioredis';
export type CaptchaProvider = 'svg-self-hosted' | 'turnstile' | 'hcaptcha' | 'recaptcha';
export interface CaptchaVerifyInput {
    /** User-supplied response. For svg-self-hosted this is the entered code. */
    token: string;
    /** Only used for svg-self-hosted — the challenge id returned at issuance. */
    captchaId?: string;
    remoteIp?: string;
    /** Optional override — defaults to process.env.CAPTCHA_PROVIDER. */
    provider?: CaptchaProvider;
    /** Optional override — defaults to process.env.CAPTCHA_SECRET. */
    secret?: string;
    /** Redis client, required when provider = svg-self-hosted. */
    redis?: Redis | null;
}
export interface CaptchaVerifyResult {
    success: boolean;
    provider: CaptchaProvider;
    /** Provider score (reCAPTCHA v3 only), 0..1. */
    score?: number;
    errors?: string[];
    /** Elapsed verifier HTTP duration in ms. */
    durationMs: number;
}
export declare function verifyCaptcha(input: CaptchaVerifyInput): Promise<CaptchaVerifyResult>;
/** Returns `true` when CAPTCHA is required in the current environment. */
export declare function captchaRequired(): boolean;
