"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
class BaseAdapter {
    token = null;
    async healthCheck(config) {
        const start = Date.now();
        try {
            await this.authenticate(config);
            return { healthy: true, latencyMs: Date.now() - start };
        }
        catch (err) {
            return {
                healthy: false,
                latencyMs: Date.now() - start,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
    isTokenExpired() {
        if (!this.token)
            return true;
        return new Date(this.token.expiresAt) <= new Date();
    }
}
exports.BaseAdapter = BaseAdapter;
//# sourceMappingURL=base.adapter.js.map