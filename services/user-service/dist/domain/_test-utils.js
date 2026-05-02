"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantClientSpy = createTenantClientSpy;
function createTenantClientSpy() {
    const calls = [];
    let stub = () => ({ rows: [], rowCount: 0 });
    return {
        calls,
        lastTenantId: () => calls[calls.length - 1]?.tenantId,
        setQueryStub: (next) => { stub = next; },
        withTenantClient: async (tenantId, fn) => {
            const client = {
                query: async (sql, params) => {
                    calls.push({ tenantId, sql, params: params ?? [] });
                    const r = await stub(sql, params);
                    return {
                        rows: r.rows ?? [],
                        rowCount: r.rowCount ?? (r.rows?.length ?? 0),
                        command: '',
                        oid: 0,
                        fields: [],
                    };
                },
            };
            return fn(client);
        },
    };
}
//# sourceMappingURL=_test-utils.js.map