"use strict";
// Standard circuit breaker factory using opossum. Replaces the hand-rolled
// Wave 5.3 breaker around OpenRouter / Ollama / external HTTP calls.
//
// Usage:
//   import { createBreaker } from '@dos/service-bootstrap/circuit-breaker';
//   const llmCall = createBreaker('openrouter', async (prompt) => { ... }, {
//     timeout: 30_000,
//     errorThresholdPercentage: 50,
//   });
//   const result = await llmCall.fire(prompt);
//
// Metrics on state transitions automatically flow into Prometheus via the
// existing recordCircuitBreakerState hook in createServiceServer.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBreaker = createBreaker;
exports.getBreaker = getBreaker;
exports.listBreakerStates = listBreakerStates;
const opossum_1 = __importDefault(require("opossum"));
const observability_1 = require("@dos/platform-core/observability");
const _registry = new Map();
function createBreaker(name, action, opts = {}) {
    const existing = _registry.get(name);
    if (existing)
        return existing;
    const breaker = new opossum_1.default(action, {
        timeout: opts.timeout ?? 30_000,
        errorThresholdPercentage: opts.errorThresholdPercentage ?? 50,
        resetTimeout: opts.resetTimeout ?? 30_000,
        rollingCountTimeout: opts.rollingCountTimeout ?? 10_000,
        rollingCountBuckets: opts.rollingCountBuckets ?? 10,
        name,
        ...opts,
    });
    if (opts.fallback)
        breaker.fallback(opts.fallback);
    breaker.on('open', () => (0, observability_1.recordCircuitBreakerState)(name, 'open'));
    breaker.on('halfOpen', () => (0, observability_1.recordCircuitBreakerState)(name, 'half-open'));
    breaker.on('close', () => (0, observability_1.recordCircuitBreakerState)(name, 'closed'));
    _registry.set(name, breaker);
    return breaker;
}
function getBreaker(name) {
    return _registry.get(name);
}
function listBreakerStates() {
    const out = {};
    for (const [name, b] of _registry) {
        out[name] = {
            state: b.opened ? 'open' : b.halfOpen ? 'half-open' : 'closed',
            stats: b.stats,
        };
    }
    return out;
}
//# sourceMappingURL=circuit-breaker.js.map