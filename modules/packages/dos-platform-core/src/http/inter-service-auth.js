"use strict";
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
exports.generateServiceToken = generateServiceToken;
exports.interServiceGuard = interServiceGuard;
exports.requireServiceToken = requireServiceToken;
const crypto = __importStar(require("crypto"));
const SERVICE_SECRET = process.env.INTER_SERVICE_SECRET || process.env.JWT_SECRET || '';
const ALLOWED_SERVICES = new Set((process.env.ALLOWED_SERVICE_CALLERS || '').split(',').filter(Boolean));
function generateServiceToken(sourceService, targetService) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: sourceService,
        aud: targetService,
        iat: now,
        exp: now + 300,
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', SERVICE_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}
function verifyServiceToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const [header, body, signature] = parts;
        const expected = crypto
            .createHmac('sha256', SERVICE_SECRET)
            .update(`${header}.${body}`)
            .digest('base64url');
        if (signature !== expected)
            return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000))
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
function interServiceGuard(thisService) {
    return (req, res, next) => {
        if (!SERVICE_SECRET) {
            next();
            return;
        }
        const svcToken = req.headers['x-service-token'];
        if (!svcToken) {
            next();
            return;
        }
        const payload = verifyServiceToken(svcToken);
        if (!payload) {
            res.status(403).json({ error: 'Invalid service token', code: 'INVALID_SERVICE_TOKEN' });
            return;
        }
        if (payload.aud !== thisService && payload.aud !== '*') {
            res.status(403).json({ error: 'Service token audience mismatch', code: 'SERVICE_TOKEN_AUDIENCE_MISMATCH' });
            return;
        }
        if (ALLOWED_SERVICES.size > 0 && !ALLOWED_SERVICES.has(payload.iss)) {
            res.status(403).json({ error: 'Service not in allowed callers list', code: 'SERVICE_NOT_ALLOWED' });
            return;
        }
        if (SERVICE_SECRET && req.headers['x-body-signature'] && req.body) {
            const expectedSig = crypto
                .createHmac('sha256', SERVICE_SECRET)
                .update(JSON.stringify(req.body))
                .digest('hex')
                .slice(0, 32);
            if (req.headers['x-body-signature'] !== expectedSig) {
                res.status(403).json({ error: 'Body signature mismatch', code: 'BODY_SIGNATURE_MISMATCH' });
                return;
            }
        }
        req.callingService = payload.iss;
        next();
    };
}
function requireServiceToken(thisService) {
    return (req, res, next) => {
        if (!SERVICE_SECRET) {
            next();
            return;
        }
        const svcToken = req.headers['x-service-token'];
        if (!svcToken) {
            res.status(401).json({ error: 'Service token required', code: 'SERVICE_TOKEN_REQUIRED' });
            return;
        }
        const payload = verifyServiceToken(svcToken);
        if (!payload) {
            res.status(403).json({ error: 'Invalid service token', code: 'INVALID_SERVICE_TOKEN' });
            return;
        }
        if (payload.aud !== thisService && payload.aud !== '*') {
            res.status(403).json({ error: 'Service token audience mismatch', code: 'SERVICE_TOKEN_AUDIENCE_MISMATCH' });
            return;
        }
        req.callingService = payload.iss;
        next();
    };
}
//# sourceMappingURL=inter-service-auth.js.map