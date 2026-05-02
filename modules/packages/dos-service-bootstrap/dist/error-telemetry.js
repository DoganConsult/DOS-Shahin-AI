"use strict";
// Sentry init shared across every service. Wired at the top of
// createServiceServer so it captures ALL subsequent errors. Uses GlitchTip
// (Sentry-protocol-compatible) running natively on :8000 by default.
//
// Configure via env:
//   SENTRY_DSN              — full DSN. If unset, init is a no-op.
//   SENTRY_ENV              — defaults to NODE_ENV.
//   SENTRY_RELEASE          — defaults to GIT_SHA or APP_VERSION.
//   SENTRY_TRACES_SAMPLE    — 0..1, defaults 0.05 (5%).
//   SENTRY_PROFILES_SAMPLE  — 0..1, defaults 0.
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
exports.sentry = void 0;
exports.initErrorTelemetry = initErrorTelemetry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
const Sentry = __importStar(require("@sentry/node"));
let _initialized = false;
function initErrorTelemetry(opts) {
    if (_initialized)
        return true;
    const dsn = opts.dsn ?? process.env.SENTRY_DSN;
    if (!dsn)
        return false;
    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
        release: process.env.SENTRY_RELEASE ?? process.env.GIT_SHA ?? process.env.APP_VERSION,
        serverName: opts.serviceCode,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE ?? '0.05'),
        profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE ?? '0'),
        sendDefaultPii: false,
        beforeSend(event) {
            // Strip tokens from breadcrumbs and request payloads — defense in depth
            // even though pino redact already handles structured logs.
            if (event.request?.headers) {
                for (const k of ['authorization', 'cookie', 'x-service-token']) {
                    if (event.request.headers[k])
                        event.request.headers[k] = '[REDACTED]';
                }
            }
            return event;
        },
    });
    _initialized = true;
    return true;
}
function captureException(err, ctx) {
    if (!_initialized)
        return;
    Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
}
function captureMessage(msg, level = 'info') {
    if (!_initialized)
        return;
    Sentry.captureMessage(msg, level);
}
exports.sentry = Sentry;
//# sourceMappingURL=error-telemetry.js.map