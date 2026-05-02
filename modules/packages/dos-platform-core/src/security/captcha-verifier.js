"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCaptcha = verifyCaptcha;
exports.captchaRequired = captchaRequired;
const captcha_svg_service_1 = require("./captcha-svg.service");
const EXTERNAL_PROVIDER_URLS = {
    turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    hcaptcha: 'https://hcaptcha.com/siteverify',
    recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
};
function resolveProvider(override) {
    const raw = (override || process.env.CAPTCHA_PROVIDER || 'svg-self-hosted').toLowerCase();
    if (raw === 'svg-self-hosted' ||
        raw === 'hcaptcha' ||
        raw === 'recaptcha' ||
        raw === 'turnstile') {
        return raw;
    }
    return 'svg-self-hosted';
}
function isDevBypass() {
    if (process.env.NODE_ENV === 'production')
        return false;
    return process.env.CAPTCHA_DEV_BYPASS === 'true';
}
function timeoutMs() {
    const raw = parseInt(process.env.CAPTCHA_TIMEOUT_MS || '', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 3000;
}
async function verifyCaptcha(input) {
    const provider = resolveProvider(input.provider);
    const startedAt = Date.now();
    if (isDevBypass()) {
        return { success: true, provider, durationMs: 0, errors: ['dev-bypass'] };
    }
    // ── Self-hosted SVG branch ──────────────────────────────────────────────
    if (provider === 'svg-self-hosted') {
        if (!input.captchaId) {
            return {
                success: false,
                provider,
                durationMs: Date.now() - startedAt,
                errors: ['missing-captcha-id'],
            };
        }
        if (!input.token) {
            return {
                success: false,
                provider,
                durationMs: Date.now() - startedAt,
                errors: ['missing-token'],
            };
        }
        const r = await (0, captcha_svg_service_1.verifyCaptchaSvg)(input.redis ?? null, input.captchaId, input.token);
        return {
            success: r.success,
            provider,
            durationMs: Date.now() - startedAt,
            errors: r.reason ? [r.reason] : undefined,
        };
    }
    // ── External HTTP-verified providers ───────────────────────────────────
    const secret = input.secret || process.env.CAPTCHA_SECRET || '';
    if (!secret) {
        return {
            success: false,
            provider,
            durationMs: Date.now() - startedAt,
            errors: ['missing-secret'],
        };
    }
    if (!input.token || input.token.length < 4) {
        return {
            success: false,
            provider,
            durationMs: Date.now() - startedAt,
            errors: ['missing-token'],
        };
    }
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', input.token);
    if (input.remoteIp)
        body.set('remoteip', input.remoteIp);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());
    try {
        const resp = await fetch(EXTERNAL_PROVIDER_URLS[provider], {
            method: 'POST',
            body,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            signal: controller.signal,
        });
        const json = (await resp.json().catch(() => ({})));
        const duration = Date.now() - startedAt;
        const success = json.success === true;
        const errors = Array.isArray(json['error-codes'])
            ? json['error-codes']
            : undefined;
        const score = typeof json.score === 'number' ? json.score : undefined;
        return { success, provider, durationMs: duration, errors, score };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            provider,
            durationMs: Date.now() - startedAt,
            errors: [`verifier-error:${msg.slice(0, 120)}`],
        };
    }
    finally {
        clearTimeout(timer);
    }
}
/** Returns `true` when CAPTCHA is required in the current environment. */
function captchaRequired() {
    return process.env.CAPTCHA_REQUIRED === 'true';
}
//# sourceMappingURL=captcha-verifier.js.map