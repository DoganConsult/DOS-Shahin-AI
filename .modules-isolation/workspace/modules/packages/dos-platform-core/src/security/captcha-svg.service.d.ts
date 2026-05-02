/**
 * Self-hosted SVG CAPTCHA — extracted from
 * /home/Dr-Dogan-AGRC-OS/backend/src/platform/dos/security/services/captcha.service.ts
 *
 * Generates a one-off SVG challenge, stores the expected answer in Redis with a
 * short TTL, and verifies the user-entered code against it. No third-party
 * services involved.
 *
 * Public API:
 *   generateCaptcha()   → { captchaId, svg, expiresInSeconds }
 *   verifyCaptchaSvg(captchaId, code) → { success, reason? }
 *
 * Redis key shape:
 *   captcha:svg:<captchaId>   (value = lowercase expected answer)
 *
 * Fail-closed: any Redis error during verify returns `success: false` with a
 * descriptive reason. Callers (e.g. register command) must treat verify
 * failures as challenge failures — no silent pass.
 */
import type { Redis } from 'ioredis';
export interface SvgCaptchaChallenge {
    captchaId: string;
    svg: string;
    expiresInSeconds: number;
}
export interface SvgCaptchaVerifyResult {
    success: boolean;
    reason?: string;
}
export declare function generateSvgCaptcha(redis: Redis | null | undefined): Promise<SvgCaptchaChallenge>;
export declare function verifyCaptchaSvg(redis: Redis | null | undefined, captchaId: string, code: string): Promise<SvgCaptchaVerifyResult>;
