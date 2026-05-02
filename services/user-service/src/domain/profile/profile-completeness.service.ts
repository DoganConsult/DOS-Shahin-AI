import { safeQuery, tenantSchema } from '@dos/db';

export interface CompletenessRule {
  field: string;
  label: string;
  weight: number;
  required: boolean;
  check: (profile: Record<string, unknown>) => boolean;
}

export interface ProfileCompletenessResult {
  userId: string;
  score: number;
  maxScore: number;
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  missingRequired: string[];
}

export function getDefaultRules(): CompletenessRule[] {
  return [
    { field: 'display_name', label: 'Display Name', weight: 15, required: true, check: p => !!p['display_name'] },
    { field: 'email', label: 'Email', weight: 15, required: true, check: p => !!p['email'] },
    { field: 'role_code', label: 'Role', weight: 20, required: true, check: p => !!p['role_code'] },
    { field: 'department_id', label: 'Department', weight: 10, required: false, check: p => !!p['department_id'] },
    { field: 'display_name_ar', label: 'Arabic Name', weight: 10, required: false, check: p => !!p['display_name_ar'] },
    { field: 'avatar_url', label: 'Avatar', weight: 5, required: false, check: p => !!p['avatar_url'] },
    { field: 'language_code', label: 'Language', weight: 5, required: false, check: p => !!p['language_code'] && p['language_code'] !== 'en' },
    { field: 'timezone', label: 'Timezone', weight: 5, required: false, check: p => !!p['timezone'] && p['timezone'] !== 'UTC' },
    { field: 'team_id', label: 'Team', weight: 10, required: false, check: p => !!p['team_id'] },
    { field: 'phone', label: 'Phone', weight: 5, required: false, check: p => !!p['phone'] },
  ];
}

export function computeProfileCompleteness(
  profile: Record<string, unknown>,
  rules: CompletenessRule[] = getDefaultRules(),
): ProfileCompletenessResult {
  const userId = String(profile['user_id'] ?? profile['userId'] ?? '');
  const completedFields: string[] = [];
  const missingFields: string[] = [];
  const missingRequired: string[] = [];
  let score = 0;
  let maxScore = 0;

  for (const rule of rules) {
    maxScore += rule.weight;
    if (rule.check(profile)) {
      score += rule.weight;
      completedFields.push(rule.field);
    } else {
      missingFields.push(rule.field);
      if (rule.required) missingRequired.push(rule.field);
    }
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return { userId, score, maxScore, percentage, completedFields, missingFields, missingRequired };
}

export async function getProfileCompleteness(
  tenantId: string,
  userId: string,
  rules?: CompletenessRule[],
): Promise<ProfileCompletenessResult> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".users WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  const profile: Record<string, unknown> = rows[0] ?? { user_id: userId };
  return computeProfileCompleteness(profile, rules ?? getDefaultRules());
}
