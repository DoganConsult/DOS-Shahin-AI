export function getOrCreateBreaker(_name) { return { state: 'closed', exec: async (fn) => fn() }; }
//# sourceMappingURL=ai-circuit-breaker.service.js.map