import { Injectable } from '@angular/core';
import { OnboardingQuestion } from '../../models/onboarding.models';

/**
 * OnboardingValidationService
 *
 * Handles field-level validation, visibility rule evaluation,
 * and stage-level validation for the onboarding flow.
 */
@Injectable()
export class OnboardingValidationService {

  /**
   * Validate a single field against its validation_json rules.
   * Returns an error message string, or null if valid.
   */
  validateField(
    questionCode: string,
    value: unknown,
    questions: OnboardingQuestion[],
    isAr: boolean,
  ): string | null {
    const q = questions.find(x => x.question_code === questionCode);
    if (!q || !q.validation_json || Object.keys(q.validation_json).length === 0) {
      return null;
    }
    const rules = q.validation_json as { required?: boolean; minLength?: number; maxLength?: number; pattern?: string; patternMessage?: string; patternMessageAr?: string; min?: number; max?: number; email?: boolean };

    if (rules.required && (value == null || value === '' || (Array.isArray(value) && value.length === 0))) {
      return isAr ? 'هذا الحقل مطلوب' : 'This field is required';
    }
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return isAr ? `الحد الأدنى ${rules.minLength} حرف` : `Minimum ${rules.minLength} characters`;
    }
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return isAr ? `الحد الأقصى ${rules.maxLength} حرف` : `Maximum ${rules.maxLength} characters`;
    }
    if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
      return isAr ? (rules.patternMessageAr || 'تنسيق غير صالح') : (rules.patternMessage || 'Invalid format');
    }
    if (rules.min != null && typeof value === 'number' && value < rules.min) {
      return isAr ? `القيمة الدنيا ${rules.min}` : `Minimum value is ${rules.min}`;
    }
    if (rules.max != null && typeof value === 'number' && value > rules.max) {
      return isAr ? `القيمة القصوى ${rules.max}` : `Maximum value is ${rules.max}`;
    }
    if (rules.email && typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // CASCADING VISIBILITY ENGINE
  // Evaluates visibility_rule_json against current answers.
  // Supports: eq, neq, in, notIn, truthy, falsy, gt, lt, contains
  // Composite: { operator: "AND"|"OR", conditions: [...] }
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine whether a question should be visible based on its
   * visibility_rule_json and the current answers dictionary.
   */
  isQuestionVisible(q: OnboardingQuestion, answers: Record<string, any>): boolean {
    const rule = q.visibility_rule_json;
    if (!rule || Object.keys(rule).length === 0) return true;
    return this.evaluateVisibilityRule(rule, answers);
  }

  /**
   * Evaluate a visibility rule (potentially composite) recursively.
   */
  evaluateVisibilityRule(rule: Record<string, any>, answers: Record<string, any>): boolean {
    if (!rule) return true;

    // Composite rule: { operator: "AND"|"OR", conditions: [...] }
    if (rule.operator && Array.isArray(rule.conditions)) {
      if (rule.operator === 'AND') {
        return rule.conditions.every(( c: Record<string, any>) => this.evaluateVisibilityRule(c, answers));
      }
      if (rule.operator === 'OR') {
        return rule.conditions.some(( c: Record<string, any>) => this.evaluateVisibilityRule(c, answers));
      }
    }

    // Single condition: { questionCode, op, value }
    if (rule.questionCode && rule.op) {
      return this.evaluateCondition(rule.questionCode, rule.op, rule.value, answers);
    }
    return true;
  }

  /**
   * Evaluate a single condition against the answers dictionary.
   */
  private evaluateCondition(questionCode: string, op: string, expected: unknown, answers: Record<string, any>): boolean {
    const actual = answers[questionCode];
    const expectedNumber = typeof expected === 'number' ? expected : Number(expected);
    switch (op) {
      case 'eq':       return actual === expected;
      case 'neq':      return actual !== expected;
      case 'truthy':   return !!actual;
      case 'falsy':    return !actual;
      case 'gt':       return typeof actual === 'number' && Number.isFinite(expectedNumber) && actual > expectedNumber;
      case 'lt':       return typeof actual === 'number' && Number.isFinite(expectedNumber) && actual < expectedNumber;
      case 'in':       return Array.isArray(expected) && expected.includes(actual);
      case 'notIn':    return Array.isArray(expected) && !expected.includes(actual);
      case 'contains':
        if (Array.isArray(actual)) return actual.includes(expected);
        if (typeof actual === 'string') return typeof expected === 'string' && actual.includes(expected);
        return false;
      default:         return true;
    }
  }
}
