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
exports.ServiceClient = void 0;
exports.getAllCircuitStates = getAllCircuitStates;
exports.createServiceClient = createServiceClient;
const inter_service_auth_1 = require("./inter-service-auth");
const crypto = __importStar(require("crypto"));
const correlation_1 = require("./correlation");
const _circuits = new Map();
function getCircuit(target, threshold, resetMs) {
    let cb = _circuits.get(target);
    if (!cb) {
        cb = { state: 'CLOSED', failures: 0, lastFailure: 0, threshold, resetMs };
        _circuits.set(target, cb);
    }
    return cb;
}
function checkCircuit(cb) {
    if (cb.state === 'CLOSED')
        return true;
    if (cb.state === 'OPEN' && Date.now() - cb.lastFailure >= cb.resetMs) {
        cb.state = 'HALF_OPEN';
        return true;
    }
    return cb.state === 'HALF_OPEN';
}
function recordSuccess(cb) {
    cb.failures = 0;
    cb.state = 'CLOSED';
}
function recordFailure(cb) {
    cb.failures++;
    cb.lastFailure = Date.now();
    if (cb.failures >= cb.threshold)
        cb.state = 'OPEN';
}
const _tokenCache = new Map();
const TOKEN_CACHE_TTL_MS = 240_000;
function getCachedToken(source, target) {
    const key = `${source}:${target}`;
    const cached = _tokenCache.get(key);
    if (cached && cached.expiresAt > Date.now())
        return cached.token;
    const token = (0, inter_service_auth_1.generateServiceToken)(source, target);
    _tokenCache.set(key, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    return token;
}
function signBody(body, secret) {
    if (!body)
        return '';
    return crypto.createHmac('sha256', secret).update(body).digest('hex').slice(0, 32);
}
function getAllCircuitStates() {
    return [..._circuits.entries()].map(([target, cb]) => ({
        target, state: cb.state, failures: cb.failures,
    }));
}
const SERVICE_PORTS = {
    gateway: 4000,
    'auth-service': 4001,
    'tenant-service': 4002,
    'user-service': 4003,
    'workflow-service': 4004,
    'notification-service': 4005,
    'audit-service': 4006,
    'ai-gateway-service': 4007,
    'onboarding-service': 4010,
    'governance-policy-service': 4011,
    'compliance-controls-service': 4012,
    'risk-incident-service': 4013,
    'evidence-audit-reporting-service': 4014,
    'vendor-service': 4015,
    'asset-service': 4016,
    'bcp-service': 4017,
    'training-service': 4018,
    'privacy-service': 4019,
    'dora-service': 4020,
    'remediation-action-service': 4021,
    'qiyas-journey-service': 4022,
    'dashboard-widgets-service': 4023,
    'analytics-service': 4024,
    'executive-intelligence-service': 4025,
    'integrations-service': 4026,
    'notification-inbox-service': 4027,
    'portals-service': 4028,
    'records-service': 4029,
    'platform-product-service': 4030,
    'agrc-os-service': 4031,
};
function resolveBaseUrl(targetService) {
    const envKey = `SERVICE_URL_${targetService.replace(/-/g, '_').toUpperCase()}`;
    const envUrl = process.env[envKey];
    if (envUrl)
        return envUrl;
    const port = SERVICE_PORTS[targetService];
    if (!port)
        throw new Error(`Unknown service: ${targetService}`);
    return `http://127.0.0.1:${port}`;
}
class ServiceClient {
    sourceService;
    timeoutMs;
    retries;
    retryDelayMs;
    cbThreshold;
    cbResetMs;
    constructor(options) {
        this.sourceService = options.sourceService;
        this.timeoutMs = options.timeoutMs ?? 10_000;
        this.retries = options.retries ?? 2;
        this.retryDelayMs = options.retryDelayMs ?? 500;
        this.cbThreshold = options.circuitBreakerThreshold ?? 5;
        this.cbResetMs = options.circuitBreakerResetMs ?? 30_000;
    }
    buildHeaders(targetService, bodyStr, extra) {
        const headers = {
            'Content-Type': 'application/json',
            'x-service-token': getCachedToken(this.sourceService, targetService),
            'x-source-service': this.sourceService,
        };
        const correlationId = (0, correlation_1.getCorrelationId)();
        if (correlationId)
            headers['x-correlation-id'] = correlationId;
        const ctx = correlation_1.requestContext.getStore();
        if (ctx?.tenantId)
            headers['x-tenant-id'] = ctx.tenantId;
        if (ctx?.userId)
            headers['x-user-id'] = ctx.userId;
        const secret = process.env.INTER_SERVICE_SECRET || process.env.JWT_SECRET || '';
        if (secret && bodyStr) {
            headers['x-body-signature'] = signBody(bodyStr, secret);
        }
        if (extra)
            Object.assign(headers, extra);
        return headers;
    }
    async request(targetService, path, options = {}) {
        const cb = getCircuit(targetService, this.cbThreshold, this.cbResetMs);
        if (!checkCircuit(cb)) {
            throw new Error(`Circuit breaker OPEN for ${targetService} — request rejected`);
        }
        const baseUrl = resolveBaseUrl(targetService);
        const url = `${baseUrl}${path}`;
        const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
        const headers = this.buildHeaders(targetService, bodyStr, options.headers);
        if (options.tenantId)
            headers['x-tenant-id'] = options.tenantId;
        let lastError = null;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
                try {
                    const res = await fetch(url, {
                        method: options.method || 'GET',
                        headers,
                        body: bodyStr,
                        signal: controller.signal,
                    });
                    const responseHeaders = {};
                    res.headers.forEach((v, k) => { responseHeaders[k] = v; });
                    const data = await res.json().catch(() => null);
                    if (res.status < 500) {
                        recordSuccess(cb);
                    }
                    else {
                        recordFailure(cb);
                    }
                    return { status: res.status, data, headers: responseHeaders };
                }
                finally {
                    clearTimeout(timeout);
                }
            }
            catch (err) {
                lastError = err;
                recordFailure(cb);
                if (attempt < this.retries) {
                    await new Promise(r => setTimeout(r, this.retryDelayMs * Math.pow(2, attempt)));
                }
            }
        }
        throw lastError || new Error(`Request to ${targetService}${path} failed`);
    }
    async get(targetService, path, opts) {
        return this.request(targetService, path, { method: 'GET', ...opts });
    }
    async post(targetService, path, body, opts) {
        return this.request(targetService, path, { method: 'POST', body, ...opts });
    }
    async put(targetService, path, body, opts) {
        return this.request(targetService, path, { method: 'PUT', body, ...opts });
    }
    async patch(targetService, path, body, opts) {
        return this.request(targetService, path, { method: 'PATCH', body, ...opts });
    }
    async delete(targetService, path, opts) {
        return this.request(targetService, path, { method: 'DELETE', ...opts });
    }
}
exports.ServiceClient = ServiceClient;
function createServiceClient(sourceService, options) {
    return new ServiceClient({ sourceService, ...options });
}
//# sourceMappingURL=service-client.js.map