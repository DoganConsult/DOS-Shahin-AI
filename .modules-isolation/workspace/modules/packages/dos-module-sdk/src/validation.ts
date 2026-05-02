/**
 * @dos/module-sdk validation utilities
 * Common validation functions for module development
 */

// ────────────────────────────────────────────────────────────────────────────
// UUID Validation
// ────────────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function assertUUID(value: unknown, fieldName = 'id'): asserts value is string {
  if (!isUUID(value)) {
    throw new Error(`Invalid UUID for ${fieldName}: ${String(value)}`);
  }
}

export function parseUUID(value: unknown, fieldName = 'id'): string {
  assertUUID(value, fieldName);
  return value;
}

// ────────────────────────────────────────────────────────────────────────────
// String Validation
// ────────────────────────────────────────────────────────────────────────────

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (!isNonEmptyString(value)) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function assertEmail(value: unknown, fieldName = 'email'): asserts value is string {
  if (!isEmail(value)) {
    throw new Error(`Invalid email format for ${fieldName}: ${String(value)}`);
  }
}

export function isSlug(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(value);
}

export function assertSlug(value: unknown, fieldName = 'slug'): asserts value is string {
  if (!isSlug(value)) {
    throw new Error(`Invalid slug format for ${fieldName}: ${String(value)}`);
  }
}

export function sanitizeString(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

export function truncateString(value: string, maxLength: number, suffix = '...'): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - suffix.length) + suffix;
}

// ────────────────────────────────────────────────────────────────────────────
// Number Validation
// ────────────────────────────────────────────────────────────────────────────

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function assertPositiveInteger(value: unknown, fieldName: string): asserts value is number {
  if (!isPositiveInteger(value)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function parseIntSafe(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

export function parseFloatSafe(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

// ────────────────────────────────────────────────────────────────────────────
// Boolean Validation
// ────────────────────────────────────────────────────────────────────────────

export function parseBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// ────────────────────────────────────────────────────────────────────────────
// Date Validation
// ────────────────────────────────────────────────────────────────────────────

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function parseDateInternal(value: unknown): Date | null {
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  return null;
}

export function assertValidDate(value: unknown, fieldName = 'date'): asserts value is Date {
  const date = parseDateInternal(value);
  if (!date) {
    throw new Error(`Invalid date for ${fieldName}: ${String(value)}`);
  }
}

export function isISODateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoDateRegex.test(value);
}

// ────────────────────────────────────────────────────────────────────────────
// Array Validation
// ────────────────────────────────────────────────────────────────────────────

export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

export function assertNonEmptyArray<T>(value: unknown, fieldName: string): asserts value is [T, ...T[]] {
  if (!isNonEmptyArray(value)) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
}

export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function uniqueArrayBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Object Validation
// ────────────────────────────────────────────────────────────────────────────

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function assertPlainObject(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(`${fieldName} must be a plain object`);
  }
}

export function hasOwnProperty<T extends object, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function pickKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (hasOwnProperty(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omitKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as Omit<T, K>;
  for (const key of keys) {
    delete (result as Record<string, unknown>)[key as string];
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Enum Validation
// ────────────────────────────────────────────────────────────────────────────

export function isEnumValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === 'string' && (allowedValues as readonly string[]).includes(value);
}

export function assertEnumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!isEnumValue(value, allowedValues)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}. Got: ${String(value)}`);
  }
}

export function parseEnumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  return isEnumValue(value, allowedValues) ? value : defaultValue;
}

// ────────────────────────────────────────────────────────────────────────────
// Required Field Validation
// ────────────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
}

export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      issues.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED',
      });
    }
  }
  return issues;
}

export function assertRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  const issues = validateRequired(data, requiredFields);
  if (issues.length > 0) {
    const message = issues.map(i => i.message).join('; ');
    throw new Error(`Missing required fields: ${message}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// JSON Validation
// ────────────────────────────────────────────────────────────────────────────

export function parseJSON<T = unknown>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function safeStringify(value: unknown, space?: number): string {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return String(value);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Permission/Code Validation
// ────────────────────────────────────────────────────────────────────────────

const MODULE_CODE_REGEX = /^[A-Z][A-Z0-9_]{1,30}$/;
const PERMISSION_CODE_REGEX = /^[a-z][a-z0-9_:.]{2,100}$/;

export function isModuleCode(value: unknown): value is string {
  return typeof value === 'string' && MODULE_CODE_REGEX.test(value);
}

export function assertModuleCode(value: unknown, fieldName = 'moduleCode'): asserts value is string {
  if (!isModuleCode(value)) {
    throw new Error(`Invalid module code for ${fieldName}: ${String(value)}. Must be uppercase alphanumeric with underscores, 2-31 characters`);
  }
}

export function isPermissionCode(value: unknown): value is string {
  return typeof value === 'string' && PERMISSION_CODE_REGEX.test(value);
}

export function assertPermissionCode(value: unknown, fieldName = 'permissionCode'): asserts value is string {
  if (!isPermissionCode(value)) {
    throw new Error(`Invalid permission code for ${fieldName}: ${String(value)}. Must be lowercase with dots/colons, 3-101 characters`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Composite Validators
// ────────────────────────────────────────────────────────────────────────────

export interface FieldValidator<T> {
  validate: (value: unknown) => value is T;
  parse: (value: unknown) => T | null;
  assert: (value: unknown, fieldName?: string) => asserts value is T;
}

export const Validators = {
  uuid: {
    validate: isUUID,
    parse: (v: unknown) => isUUID(v) ? v : null,
    assert: assertUUID,
  } as FieldValidator<string>,

  email: {
    validate: isEmail,
    parse: (v: unknown) => isEmail(v) ? v : null,
    assert: assertEmail,
  } as FieldValidator<string>,

  nonEmptyString: {
    validate: isNonEmptyString,
    parse: (v: unknown) => isNonEmptyString(v) ? v : null,
    assert: assertNonEmptyString,
  } as FieldValidator<string>,

  positiveInteger: {
    validate: isPositiveInteger,
    parse: (v: unknown) => isPositiveInteger(v) ? v : null,
    assert: assertPositiveInteger,
  } as FieldValidator<number>,

  moduleCode: {
    validate: isModuleCode,
    parse: (v: unknown) => isModuleCode(v) ? v : null,
    assert: assertModuleCode,
  } as FieldValidator<string>,

  permissionCode: {
    validate: isPermissionCode,
    parse: (v: unknown) => isPermissionCode(v) ? v : null,
    assert: assertPermissionCode,
  } as FieldValidator<string>,
};
