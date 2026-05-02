"use strict";
// CSRF protection for cookie-session flows (DAuth). Only the gateway and
// auth-service expose mutating endpoints with cookie auth — other services
// authenticate via JWT bearer and don't need CSRF.
//
// Usage in gateway/server.ts (after cookieParser, before mutating routes):
//
//   import { createCsrfMiddleware } from '@dos/service-bootstrap/csrf';
//   const { doubleCsrfProtection, generateCsrfToken } = createCsrfMiddleware();
//   app.use(doubleCsrfProtection);
//   app.get('/api/auth/csrf', (req, res) => res.json({ token: generateCsrfToken(req, res) }));
//
// Configure via env:
//   CSRF_SECRET            — required in production. Falls back to a derived
//                            key from JWT_SECRET if unset (with a warning).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCsrfMiddleware = createCsrfMiddleware;
const csrf_csrf_1 = require("csrf-csrf");
const crypto = __importStar(require("crypto"));
function resolveSecret(override) {
    if (override)
        return override;
    const env = process.env.CSRF_SECRET;
    if (env)
        return env;
    const jwtSec = process.env.JWT_SECRET;
    if (jwtSec)
        return crypto.createHash('sha256').update(`csrf:${jwtSec}`).digest('hex');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('CSRF_SECRET (or JWT_SECRET) must be set in production');
    }
    return 'dev-only-csrf-secret-do-not-use-in-prod';
}
function createCsrfMiddleware(opts = {}) {
    const secret = resolveSecret(opts.secret);
    const ignoredRoutes = opts.ignoredRoutes ?? [
        /^\/health/, /^\/ready$/, /^\/metrics$/, /^\/diagnostics$/, /^\/sla$/,
    ];
    return (0, csrf_csrf_1.doubleCsrf)({
        getSecret: () => secret,
        getSessionIdentifier: (req) => {
            // Bind tokens to the user's session cookie / JWT subject so a token
            // valid for one user can't be replayed by another.
            const session = req.cookies?.['dauth_session'] || req.cookies?.['session'];
            const sub = req.user?.userId || req.user?.sub;
            return session || sub || req.ip || 'anonymous';
        },
        cookieName: '__Host-dos-csrf',
        cookieOptions: {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        },
        size: 64,
        ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
        getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] ?? req.body?._csrf,
        skipCsrfProtection: (req) => ignoredRoutes.some((r) => (typeof r === 'string' ? req.path === r : r.test(req.path))),
        ...opts,
    });
}
//# sourceMappingURL=csrf.js.map