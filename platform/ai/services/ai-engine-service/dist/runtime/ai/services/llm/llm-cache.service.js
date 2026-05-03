/**
 * llm-cache.service — minimal in-engine implementation.
 *
 * @owner AI
 * Provides a no-op cache surface so callers compile and degrade safely until
 * the canonical Redis/Config-OS-backed cache lands. Returns null on get,
 * accepts and discards on set.
 */
export async function getCachedLLMResponse(_messages, _agentId) {
    return null;
}
export async function setCachedLLMResponse(_messages, _agentId, _response) {
    return;
}
//# sourceMappingURL=llm-cache.service.js.map