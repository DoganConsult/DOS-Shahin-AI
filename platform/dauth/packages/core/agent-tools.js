"use strict";
/**
 * DAuth agent tools.
 *
 * AI agents use these to query identity, access, and governance state.
 * Built with the DAuthPort already bound at auth-service bootstrap.
 * Called from the AI engine with tenantId injected per-call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDAuthAgentTools = buildDAuthAgentTools;
function buildDAuthAgentTools(deps) {
    return [
        {
            name: 'dauth.check_access',
            description: 'Check whether a user is allowed to perform a given action on a resource type. Returns allow/deny + reason codes + decisionId.',
            input_schema: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    roles: { type: 'array', items: { type: 'string' } },
                    scopes: { type: 'array', items: { type: 'string' } },
                    action: { type: 'string', description: 'E.g. "risk.read", "compliance.approve".' },
                    resourceType: { type: 'string' },
                    resourceId: { type: 'string' },
                },
                required: ['userId', 'action', 'resourceType'],
            },
            handler: async (tenantId, input) => {
                return deps.port.checkAccess({
                    principal: {
                        userId: String(input.userId),
                        tenantId,
                        roles: input.roles ?? [],
                        scopes: input.scopes ?? [],
                    },
                    action: String(input.action),
                    resource: {
                        type: String(input.resourceType),
                        id: input.resourceId,
                    },
                });
            },
        },
        {
            name: 'dauth.check_authority',
            description: 'Check whether a user holds a given decision authority (e.g. CAN_APPROVE_RISK_ACCEPTANCE). Returns boolean.',
            input_schema: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    authorityCode: { type: 'string' },
                    targetType: { type: 'string' },
                    targetId: { type: 'string' },
                },
                required: ['userId', 'authorityCode'],
            },
            handler: async (tenantId, input) => {
                const holds = await deps.port.checkAuthority({
                    principal: { userId: String(input.userId), tenantId, roles: [], scopes: [] },
                    authorityCode: String(input.authorityCode),
                    targetEntity: input.targetType && input.targetId
                        ? { type: String(input.targetType), id: String(input.targetId) }
                        : undefined,
                });
                return { userId: input.userId, authorityCode: input.authorityCode, holds };
            },
        },
        {
            name: 'dauth.evaluate_sod',
            description: 'Evaluate segregation-of-duties for a proposed role/permission grant list. Returns { conflict: boolean, ruleCodes: string[] }.',
            input_schema: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    proposedGrants: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                roleCode: { type: 'string' },
                                permissionCode: { type: 'string' },
                            },
                        },
                    },
                },
                required: ['userId', 'proposedGrants'],
            },
            handler: async (tenantId, input) => {
                return deps.port.evaluateSoD({ userId: String(input.userId), tenantId, roles: [], scopes: [] }, input.proposedGrants ?? []);
            },
        },
    ];
}
//# sourceMappingURL=agent-tools.js.map