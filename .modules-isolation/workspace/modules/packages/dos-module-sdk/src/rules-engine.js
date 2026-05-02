"use strict";
/// <reference path="./json-rules-engine.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateComplianceRules = evaluateComplianceRules;
let _EngineClass = null;
async function loadEngineClass() {
    if (_EngineClass)
        return _EngineClass;
    const mod = await import('json-rules-engine');
    _EngineClass = mod.Engine;
    return _EngineClass;
}
async function evaluateComplianceRules(facts, rules) {
    const Ctor = await loadEngineClass();
    const engine = new Ctor();
    for (const rule of rules) {
        engine.addRule({
            name: rule.name,
            priority: rule.priority ?? 1,
            conditions: rule.conditions,
            event: {
                type: rule.event.type,
                params: { ...rule.event.params, ruleId: rule.id, ruleName: rule.name },
            },
        });
    }
    const { events } = await engine.run(facts);
    return events.map(e => ({
        ruleId: e.params?.['ruleId'] ?? '',
        ruleName: e.params?.['ruleName'] ?? '',
        triggered: true,
        eventType: e.params?.['type'] ?? '',
        params: e.params ?? {},
    }));
}
//# sourceMappingURL=rules-engine.js.map