"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockQueryResult = mockQueryResult;
exports.emptyQueryResult = emptyQueryResult;
exports.mockTenantId = mockTenantId;
exports.mockUserId = mockUserId;
exports.mockCorrelationId = mockCorrelationId;
exports.createMockRequest = createMockRequest;
function mockQueryResult(rows, rowCount) {
    return { rows, rowCount: rowCount ?? rows.length };
}
function emptyQueryResult() {
    return { rows: [], rowCount: 0 };
}
function mockTenantId() {
    return 'test-tenant-' + Math.random().toString(36).substring(2, 8);
}
function mockUserId() {
    return 'test-user-' + Math.random().toString(36).substring(2, 8);
}
function mockCorrelationId() {
    return 'test-corr-' + Math.random().toString(36).substring(2, 12);
}
function createMockRequest(overrides) {
    const tenantId = overrides?.tenantId || mockTenantId();
    return {
        user: { userId: mockUserId(), tenantId, role: 'standard_user', ...overrides?.user },
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        correlationId: mockCorrelationId(),
        params: {},
        query: {},
        body: {},
        ...overrides,
    };
}
//# sourceMappingURL=testing.js.map