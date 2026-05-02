"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentToolRegistry = buildAgentToolRegistry;
function buildAgentToolRegistry(tools) {
    return new Map(tools.map(t => [t.name, t]));
}
//# sourceMappingURL=agent-tools.js.map