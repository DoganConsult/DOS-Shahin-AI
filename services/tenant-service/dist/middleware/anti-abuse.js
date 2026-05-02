"use strict";
/**
 * Phase G T7 — anti-abuse middleware for /register and /trials/start.
 *
 * Production-grade defaults, no external deps. All limits read from env
 * (eventual SoT: Config OS Phase B). Multi-replica deployments should
 * swap the in-memory store for Redis-backed once Phase J provisioning
 * orchestrator owns the keyspace; the middleware shape stays identical.
 *
 * Layers (short-circuit on first violation):
 *   1. IP rate-limit            — sliding window
 *   2. Email rate-limit         — sliding window
 *   3. Domain rate-limit        — sliding window (free-email domains only)
 *   4. Disposable-email block   — built-in + env-extended list
 *   5. Corporate-email gate     — optional (TRIAL_REQUIRE_CORPORATE_EMAIL)
 *   6. Domain-uniqueness gate   — one active trial per company domain
 *
 * Every block writes to console.warn with the `[anti-abuse]` tag so ops can
 * tail the trail without a separate audit table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.antiAbuse = void 0;
// ─── Built-in disposable-email blocklist (extend via env CSV) ───────────
const DEFAULT_DISPOSABLE = new Set([
    '10minutemail.com', 'mailinator.com', 'guerrillamail.com', 'tempmail.com',
    'yopmail.com', 'sharklasers.com', 'trashmail.com', 'throwawaymail.com',
    'temp-mail.org', 'dispostable.com', 'getnada.com', 'fakeinbox.com',
    'maildrop.cc', 'mintemail.com', 'spamgourmet.com', 'spam4.me',
]);
const PUBLIC_FREE_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'live.com', 'aol.com', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
    'mail.com', 'gmx.com', 'yandex.com', 'zoho.com',
]);
function envCsv(name) {
    return (process.env[name] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
function envInt(name, fallback) {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function envBool(name, fallback) {
    const v = process.env[name];
    if (v === undefined)
        return fallback;
    return /^(true|1|yes)$/i.test(v);
}
const ipWindow = new Map();
const emailWindow = new Map();
const domainWindow = new Map();
function pushAndCount(map, key, windowMs) {
    const now = Date.now();
    let w = map.get(key);
    if (!w) {
        w = { times: [] };
        map.set(key, w);
    }
    // Drop expired
    const cutoff = now - windowMs;
    while (w.times.length && w.times[0] < cutoff)
        w.times.shift();
    w.times.push(now);
    return w.times.length;
}
function pruneAll() {
    const cutoff = Date.now() - 24 * 3_600_000;
    for (const map of [ipWindow, emailWindow, domainWindow]) {
        for (const [k, w] of map.entries()) {
            while (w.times.length && w.times[0] < cutoff)
                w.times.shift();
            if (w.times.length === 0)
                map.delete(k);
        }
    }
}
setInterval(pruneAll, 10 * 60_000).unref();
function clientIp(req) {
    // trust proxy is on globally; req.ip is the canonical first XFF entry.
    return (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}
function emailDomain(email) {
    return (email.split('@')[1] || '').toLowerCase().trim();
}
function isDisposable(domain) {
    if (DEFAULT_DISPOSABLE.has(domain))
        return true;
    return envCsv('TRIAL_DISPOSABLE_EMAIL_BLOCKLIST').includes(domain);
}
function isPublicFree(domain) {
    return PUBLIC_FREE_DOMAINS.has(domain) || envCsv('TRIAL_PUBLIC_FREE_DOMAINS').includes(domain);
}
/**
 * Express middleware factory. Mount with `app.post('/register', antiAbuse(...), handler)`.
 * Reads the email from the verified caller principal (req.principal.email)
 * — never from req.body, which is untrusted.
 */
function antiAbuse(deps) {
    const HOUR = 3_600_000;
    const DAY = 24 * HOUR;
    const ipPerHour = envInt('TRIAL_RATE_IP_PER_HOUR', 10);
    const emailPerDay = envInt('TRIAL_RATE_EMAIL_PER_DAY', 3);
    const domainPerDay = envInt('TRIAL_RATE_DOMAIN_PER_DAY', 5);
    const requireCorporate = envBool('TRIAL_REQUIRE_CORPORATE_EMAIL', false);
    const oneTrialPerDomain = envBool('TRIAL_ONE_TRIAL_PER_DOMAIN', true);
    const disabled = envBool('TRIAL_ANTI_ABUSE_DISABLED', false);
    return async function antiAbuseMiddleware(req, res, next) {
        if (disabled)
            return next();
        const principal = req.principal;
        const email = (principal?.email || '').toLowerCase().trim();
        const domain = emailDomain(email);
        const ip = clientIp(req);
        if (!email || !domain) {
            // /register's normal handler also requires email — fall through and let
            // it reject; we don't double-handle.
            return next();
        }
        // Sanity: reject blatantly malformed addresses early.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            console.warn(`[anti-abuse] malformed email ip=${ip} email=${email}`);
            return res.status(400).json({ blocked: 'EMAIL_INVALID' });
        }
        // 1. IP per-hour
        if (pushAndCount(ipWindow, ip, HOUR) > ipPerHour) {
            console.warn(`[anti-abuse] ip rate-limit ip=${ip}`);
            return res.status(429).json({ blocked: 'RATE_LIMIT_IP' });
        }
        // 2. Email per-day
        if (pushAndCount(emailWindow, email, DAY) > emailPerDay) {
            console.warn(`[anti-abuse] email rate-limit email=${email}`);
            return res.status(429).json({ blocked: 'RATE_LIMIT_EMAIL' });
        }
        // 3. Domain per-day (only when public-free; corporate domains aren't capped)
        if (isPublicFree(domain) && pushAndCount(domainWindow, domain, DAY) > domainPerDay) {
            console.warn(`[anti-abuse] domain rate-limit domain=${domain}`);
            return res.status(429).json({ blocked: 'RATE_LIMIT_DOMAIN' });
        }
        // 4. Disposable email
        if (isDisposable(domain)) {
            console.warn(`[anti-abuse] disposable-email blocked domain=${domain}`);
            return res.status(400).json({ blocked: 'DISPOSABLE_EMAIL' });
        }
        // 5. Corporate-email gate (optional)
        if (requireCorporate && isPublicFree(domain)) {
            console.warn(`[anti-abuse] free-email blocked under corporate-only domain=${domain}`);
            return res.status(400).json({ blocked: 'CORPORATE_EMAIL_REQUIRED' });
        }
        // 6. Domain uniqueness (one active trial per company domain).
        //    Idempotent re-registers from the same authenticated user are allowed
        //    because /register's own handler returns {idempotent:true} when the
        //    user already has an active membership; this check fires only when
        //    a *different* user from the same domain tries a second active trial.
        if (oneTrialPerDomain && !isPublicFree(domain)) {
            try {
                const { rows } = await deps.pool.query(`SELECT trial_id, created_by_user_id FROM dos.tenant_trials
            WHERE signup_domain = $1
              AND status IN ('trial_pending_verification','trial_active','trial_expiring','trial_grace')
            LIMIT 1`, [domain]);
                if (rows.length > 0 && rows[0].created_by_user_id !== principal?.sub) {
                    console.warn(`[anti-abuse] domain already has active trial domain=${domain}`);
                    return res.status(409).json({ blocked: 'DOMAIN_TRIAL_EXISTS' });
                }
            }
            catch (err) {
                // DB hiccup must not lock new users out — log and let through.
                console.warn(`[anti-abuse] domain-uniqueness check failed: ${err.message}`);
            }
        }
        return next();
    };
}
exports.antiAbuse = antiAbuse;
//# sourceMappingURL=anti-abuse.js.map