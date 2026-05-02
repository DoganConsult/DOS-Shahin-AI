"use strict";
/**
 * AI port — outbound interface for LLM/chat completion adapter.
 * Host injects a real provider (Claude, OpenAI, etc.); default throws so
 * AI features fail-closed when unbound.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatCompletion = void 0;
exports.bindAiPort = bindAiPort;
let _createChatCompletion = async () => {
    throw new Error('[foundation] ai port not bound: call bindAiPort()');
};
function bindAiPort(impl) {
    if (impl.createChatCompletion)
        _createChatCompletion = impl.createChatCompletion;
}
const createChatCompletion = (messages, options) => _createChatCompletion(messages, options);
exports.createChatCompletion = createChatCompletion;
//# sourceMappingURL=ai.port.js.map