"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_MODEL = void 0;
exports.callClaude = callClaude;
exports.claudeJSON = claudeJSON;
exports.CLAUDE_MODEL = 'claude-sonnet-4-20250514';
async function callClaude(prompt) { return '{}'; }
async function claudeJSON(prompt) {
    const result = await callClaude(prompt);
    try {
        return JSON.parse(result);
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=claude-client.js.map