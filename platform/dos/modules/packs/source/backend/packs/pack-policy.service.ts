import { query, safeQuery } from './ports/database.port';
import { swallowNull, EC } from '@dos/platform-core/resilience';
import {
  EvaluatePackPoliciesDto,
  EvaluatePackPoliciesResultDto,
  PackPolicyDecisionDto,
} from './pack-policy.types';

/** Condition entry in a pack selection policy */
interface PolicyCondition {
  type: string;
  field?: string;
  values?: string[];
  [key: string]: unknown;
}

/** Outcome definition for a pack selection policy */
interface PolicyOutcome {
  reason?: string;
  [key: string]: unknown;
}

type PolicyRow = {
  policy_code: string;
  target_pack_code: string;
  priority: number;
  enabled: boolean;
  stop_on_match: boolean;
  conditions: PolicyCondition[];
  outcome: PolicyOutcome | null;
};

type AnswerRow = {
  question_code: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_bool: boolean | null;
  answer_date: string | null;
  answer_json: Record<string, unknown> | null;
};

export class PackPolicyService {
  async evaluate(dto: EvaluatePackPoliciesDto): Promise<EvaluatePackPoliciesResultDto> {
    const schema = await this.resolveTenantSchema(dto.tenantId);
    const policies = await this.getPolicies(schema);
    const answers = await this.getAnswers(dto.sessionId);
    const recommendation = await this.getRecommendation(dto.sessionId);

    const answerMap = this.buildAnswerMap(answers);
    const recommendationModules = this.normalizeModules(recommendation?.recommended_modules);

    const decisions: PackPolicyDecisionDto[] = [];
    const selectedPacks: Array<{ packCode: string; reason: string; policyCode: string }> = [];

    for (const policy of policies) {
      try {
        const matched = this.evaluateConditions(
          policy.conditions || [],
          answerMap,
          recommendationModules
        );

        if (matched) {
          const reason =
            policy.outcome?.reason ||
            `Selected by policy ${policy.policy_code}`;

          decisions.push({
            policyCode: policy.policy_code,
            targetPackCode: policy.target_pack_code,
            decisionStatus: 'selected',
            matched: true,
            priority: policy.priority,
            rationale: reason,
            evaluationSnapshot: {
              matched: true,
              conditions: policy.conditions || [],
            },
          });

          selectedPacks.push({
            packCode: policy.target_pack_code,
            reason,
            policyCode: policy.policy_code,
          });

          if (policy.stop_on_match) break;
        } else {
          decisions.push({
            policyCode: policy.policy_code,
            targetPackCode: policy.target_pack_code,
            decisionStatus: 'not_matched',
            matched: false,
            priority: policy.priority,
            rationale: 'Conditions not matched',
            evaluationSnapshot: {
              matched: false,
              conditions: policy.conditions || [],
            },
          });
        }
      } catch (err: unknown) {
        decisions.push({
          policyCode: policy.policy_code,
          targetPackCode: policy.target_pack_code,
          decisionStatus: 'error',
          matched: false,
          priority: policy.priority,
          rationale: (err as Error)?.message ?? 'Policy evaluation error',
          evaluationSnapshot: {
            matched: false,
            conditions: policy.conditions || [],
          },
        });
      }
    }

    const unique = this.uniqueSelected(selectedPacks);
    await this.logDecisions(schema, dto, decisions);

    return {
      sessionId: dto.sessionId,
      tenantId: dto.tenantId,
      selectedPacks: unique,
      decisions,
    };
  }

  async listDecisions(tenantId: string, sessionId: string) {
    const schema = await this.resolveTenantSchema(tenantId);
    const result = await safeQuery(
      `
      SELECT
        decision_id, session_id, tenant_id, policy_code, target_pack_code,
        decision_status, matched, priority, rationale, evaluation_snapshot,
        selected_by, created_at
      FROM "${schema}".pack_selection_decisions
      WHERE session_id = $1::uuid
      ORDER BY priority ASC, created_at ASC
      `,
      [sessionId]
    );
    return result.rows;
  }

  private async resolveTenantSchema(tenantId: string): Promise<string> {
    const result = await safeQuery(
      `SELECT schema_name FROM public.tenants WHERE tenant_id = $1::text LIMIT 1`,
      [tenantId]
    );
    const schema = result.rows[0]?.schema_name;
    if (!schema) throw new Error('Tenant schema not found');
    return schema;
  }

  private async getPolicies(schema: string): Promise<PolicyRow[]> {
    const result = await safeQuery(
      `
      SELECT policy_code, target_pack_code, priority, enabled, stop_on_match, conditions, outcome
      FROM "${schema}".pack_selection_policies
      WHERE enabled = true
      ORDER BY priority ASC, policy_code ASC
      `
    );
    return result.rows;
  }

  private async getAnswers(sessionId: string): Promise<AnswerRow[]> {
    const result = await safeQuery(
      `
      SELECT question_code, answer_text, answer_number, answer_bool, answer_date, answer_json
      FROM public.onboarding_answers
      WHERE session_id = $1::uuid
      ORDER BY question_code ASC
      `,
      [sessionId]
    );
    return result.rows;
  }

  private async getRecommendation(sessionId: string): Promise<{ recommended_modules?: any } | null> {
    const result = await safeQuery(
      `
      SELECT recommended_modules
      FROM public.onboarding_recommendations
      WHERE session_id = $1::uuid
      ORDER BY recommendation_id DESC
      LIMIT 1
      `,
      [sessionId]
    );
    return result.rows[0] ?? null;
  }

  private buildAnswerMap(rows: AnswerRow[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.question_code] =
        row.answer_json ?? row.answer_text ?? row.answer_number ?? row.answer_bool ?? row.answer_date;
    }
    return map;
  }

  private normalizeModules(input: unknown): string[] {
    if (!input) return [];
    if (Array.isArray(input)) return input.map((x) => String(x).toLowerCase());
    if (typeof input === 'object') return Object.keys(input as object).map((x) => x.toLowerCase());
    return [];
  }

  private evaluateConditions(
    conditions: PolicyCondition[],
    answerMap: Record<string, unknown>,
    recommendationModules: string[]
  ): boolean {
    if (!conditions.length) return false;
    for (const condition of conditions) {
      if (this.evaluateCondition(condition, answerMap, recommendationModules)) {
        return true;
      }
    }
    return false;
  }

  private evaluateCondition(
    condition: PolicyCondition,
    answerMap: Record<string, unknown>,
    recommendationModules: string[]
  ): boolean {
    const type = String(condition?.type || '');
    if (type === 'always') return true;
    if (type === 'answer_truthy') {
      return this.isTruthy(answerMap[condition.field]);
    }
    if (type === 'answer_includes_any') {
      const value = this.normalizeScalar(answerMap[condition.field!]);
      const tokens = (condition.values || []).map((v: string) => String(v).toLowerCase());
      return tokens.some((token: string) => value.includes(token));
    }
    if (type === 'recommendation_modules_include_any') {
      const tokens = (condition.values || []).map((v: string) => String(v).toLowerCase());
      return tokens.some((token: string) => recommendationModules.includes(token));
    }
    return false;
  }

  private normalizeScalar(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.toLowerCase();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
    if (typeof value === 'object' && value !== null && 'value' in value && typeof (value as Record<string, unknown>).value === 'string') {
      return String((value as Record<string, unknown>).value).toLowerCase();
    }
    return JSON.stringify(value).toLowerCase();
  }

  private isTruthy(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
      return ['true', 'yes', '1', 'enabled'].includes(value.trim().toLowerCase());
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.value === 'boolean') return obj.value;
      if (typeof obj.value === 'string') {
        return ['true', 'yes', '1', 'enabled'].includes(String(obj.value).trim().toLowerCase());
      }
    }
    return false;
  }

  private uniqueSelected(items: Array<{ packCode: string; reason: string; policyCode: string }>) {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.packCode)) return false;
      seen.add(item.packCode);
      return true;
    });
  }

  private async logDecisions(
    schema: string,
    dto: EvaluatePackPoliciesDto,
    decisions: PackPolicyDecisionDto[]
  ): Promise<void> {
    await swallowNull(EC.FALLBACK_QUERY, query(
      `DELETE FROM "${schema}".pack_selection_decisions WHERE session_id = $1::uuid`,
      [dto.sessionId]
    ), { tenantId: dto.tenantId, operation: 'query pack_selection_decisions' });

    for (const d of decisions) {
      await safeQuery(
        `
        INSERT INTO "${schema}".pack_selection_decisions
        (session_id, tenant_id, policy_code, target_pack_code, decision_status,
         matched, priority, rationale, evaluation_snapshot, selected_by, created_at)
        VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text,
                $6::boolean, $7::int, $8::text, $9::jsonb, 'policy_engine', now())
        `,
        [
          dto.sessionId, dto.tenantId, d.policyCode, d.targetPackCode,
          d.decisionStatus, d.matched, d.priority, d.rationale,
          JSON.stringify(d.evaluationSnapshot ?? {}),
        ]
      );
    }
  }
}
