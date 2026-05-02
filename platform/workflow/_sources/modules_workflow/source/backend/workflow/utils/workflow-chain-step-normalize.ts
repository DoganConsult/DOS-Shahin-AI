/**
 * Normalizes workflow_chain_definitions.steps JSON from DB (camelCase seeds)
 * to snake_case expected by workflow-chain-executor.service.ts.
 * cross-module-chain-handler.service.ts expects camelCase — use toCrossModuleChainSteps().
 */

import type { ChainStep, SodRule } from '../services/chains/workflow-chain-executor.service';

function num(v: any, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: any, fallback = ''): string {
  if (v == null) return fallback;
  return String(v);
}

/**
 * Parse raw JSON steps (array or JSON string) into executor ChainStep[].
 */
export function normalizeChainStepsForExecutor(raw: unknown): ChainStep[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw || '[]') : [];
  if (!Array.isArray(arr)) return [];

  return arr.map((s: Record<string, unknown>, idx: number) => {
    const stepNo = num(s.stepNo ?? s.step_no, idx + 1);
    const moduleCode = str(s.moduleCode ?? s.module_code, '');
    const taskType = str(s.taskType ?? s.task_type, 'verification');
    return {
      step_no: stepNo,
      module_code: moduleCode,
      task_type: taskType,
      name_en: str(s.nameEn ?? s.name_en, `Step ${stepNo}`),
      name_ar: s.nameAr ?? s.name_ar ?? undefined,
      sla_hours: s.slaHours != null || s.sla_hours != null ? num(s.slaHours ?? s.sla_hours, 168) : undefined,
      auto_advance: s.autoAdvance ?? s.auto_advance,
      conditions: s.conditions ?? s.condition,
    };
  });
}

export interface CrossModuleChainStep {
  stepNo: number;
  moduleCode: string;
  eventTrigger: string;
  taskType: string;
  roleCode: string;
  slaHours: number;
  nextEvent?: string;
  condition?: { field: string; op: string; value: string };
}

/**
 * Parse raw JSON steps for cross-module-chain-handler (camelCase interface).
 */
export function normalizeChainStepsForCrossModule(raw: unknown): CrossModuleChainStep[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw || '[]') : [];
  if (!Array.isArray(arr)) return [];

  return arr.map((s: Record<string, unknown>, idx: number) => {
    const stepNo = num(s.stepNo ?? s.step_no, idx + 1);
    return {
      stepNo,
      moduleCode: str(s.moduleCode ?? s.module_code, ''),
      eventTrigger: str(s.eventTrigger ?? s.event_trigger, ''),
      taskType: str(s.taskType ?? s.task_type, 'verification'),
      roleCode: str(s.roleCode ?? s.role_code, 'compliance_manager'),
      slaHours: num(s.slaHours ?? s.sla_hours, 168),
      nextEvent: s.nextEvent ?? s.next_event,
      condition: s.condition,
    };
  });
}

/**
 * SoD rules in DB (175) use roleA/moduleA/roleB/moduleB/level — not step_a/step_b.
 * Executor validateSodRules expects step_a, step_b, rule. Pass through only if present.
 */
export function normalizeSodRulesForExecutor(raw: unknown): SodRule[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw || '[]') : [];
  if (!Array.isArray(arr)) return [];
  const out: SodRule[] = [];
  for (const r of arr) {
    if (r == null || typeof r !== 'object') continue;
    const stepA = r.step_a ?? r.stepA;
    const stepB = r.step_b ?? r.stepB;
    const rule = r.rule;
    if (stepA != null && stepB != null && rule) {
      out.push({
        step_a: num(stepA, 0),
        step_b: num(stepB, 0),
        rule: rule === 'different_role' || rule === 'different_department' ? rule : 'different_user',
      });
    }
  }
  return out;
}
