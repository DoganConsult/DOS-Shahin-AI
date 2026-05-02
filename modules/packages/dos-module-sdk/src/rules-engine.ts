/// <reference path="./json-rules-engine.d.ts" />

export interface ComplianceRule {
  id: string;
  name: string;
  priority?: number;
  conditions: unknown;
  event: {
    type: string;
    params?: Record<string, unknown>;
  };
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  eventType: string;
  params: Record<string, unknown>;
}

let _EngineClass: unknown = null;

async function loadEngineClass(): Promise<unknown> {
  if (_EngineClass) return _EngineClass;
  const mod = await import('json-rules-engine');
  _EngineClass = (mod as { Engine: unknown }).Engine;
  return _EngineClass;
}

export async function evaluateComplianceRules(
  facts: Record<string, unknown>,
  rules: ComplianceRule[],
): Promise<RuleResult[]> {
  const Ctor = await loadEngineClass() as new () => {
    addRule: (rule: unknown) => void;
    run: (facts: unknown) => Promise<{ events: Array<{ params?: Record<string, unknown> }> }>;
  };
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
    ruleId: (e.params?.['ruleId'] as string) ?? '',
    ruleName: (e.params?.['ruleName'] as string) ?? '',
    triggered: true,
    eventType: (e.params?.['type'] as string) ?? '',
    params: e.params ?? {},
  }));
}
