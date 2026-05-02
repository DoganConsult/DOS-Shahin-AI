/**
 * @dos/module-sdk validation utilities
 * Common validation functions for module development
 */
export declare function isUUID(value: unknown): value is string;
export declare function assertUUID(value: unknown, fieldName?: string): asserts value is string;
export declare function parseUUID(value: unknown, fieldName?: string): string;
export declare function isNonEmptyString(value: unknown): value is string;
export declare function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string;
export declare function isEmail(value: unknown): value is string;
export declare function assertEmail(value: unknown, fieldName?: string): asserts value is string;
export declare function isSlug(value: unknown): value is string;
export declare function assertSlug(value: unknown, fieldName?: string): asserts value is string;
export declare function sanitizeString(value: string): string;
export declare function truncateString(value: string, maxLength: number, suffix?: string): string;
export declare function isPositiveInteger(value: unknown): value is number;
export declare function assertPositiveInteger(value: unknown, fieldName: string): asserts value is number;
export declare function isNonNegativeNumber(value: unknown): value is number;
export declare function clampNumber(value: number, min: number, max: number): number;
export declare function parseIntSafe(value: unknown, defaultValue: number): number;
export declare function parseFloatSafe(value: unknown, defaultValue: number): number;
export declare function parseBoolean(value: unknown, defaultValue?: boolean): boolean;
export declare function isBoolean(value: unknown): value is boolean;
export declare function isValidDate(value: unknown): value is Date;
export declare function assertValidDate(value: unknown, fieldName?: string): asserts value is Date;
export declare function isISODateString(value: unknown): value is string;
export declare function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]];
export declare function assertNonEmptyArray<T>(value: unknown, fieldName: string): asserts value is [T, ...T[]];
export declare function ensureArray<T>(value: T | T[] | undefined | null): T[];
export declare function uniqueArray<T>(arr: T[]): T[];
export declare function uniqueArrayBy<T, K>(arr: T[], keyFn: (item: T) => K): T[];
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
export declare function assertPlainObject(value: unknown, fieldName: string): asserts value is Record<string, unknown>;
export declare function hasOwnProperty<T extends object, K extends PropertyKey>(obj: T, prop: K): obj is T & Record<K, unknown>;
export declare function pickKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function omitKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
export declare function isEnumValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T;
export declare function assertEnumValue<T extends string>(value: unknown, allowedValues: readonly T[], fieldName: string): asserts value is T;
export declare function parseEnumValue<T extends string>(value: unknown, allowedValues: readonly T[], defaultValue: T): T;
export interface ValidationIssue {
    field: string;
    message: string;
    code: string;
}
export declare function validateRequired(data: Record<string, unknown>, requiredFields: string[]): ValidationIssue[];
export declare function assertRequiredFields(data: Record<string, unknown>, requiredFields: string[]): void;
export declare function parseJSON<T = unknown>(value: string): T | null;
export declare function safeStringify(value: unknown, space?: number): string;
export declare function isModuleCode(value: unknown): value is string;
export declare function assertModuleCode(value: unknown, fieldName?: string): asserts value is string;
export declare function isPermissionCode(value: unknown): value is string;
export declare function assertPermissionCode(value: unknown, fieldName?: string): asserts value is string;
export interface FieldValidator<T> {
    validate: (value: unknown) => value is T;
    parse: (value: unknown) => T | null;
    assert: (value: unknown, fieldName?: string) => asserts value is T;
}
export declare const Validators: {
    uuid: FieldValidator<string>;
    email: FieldValidator<string>;
    nonEmptyString: FieldValidator<string>;
    positiveInteger: FieldValidator<number>;
    moduleCode: FieldValidator<string>;
    permissionCode: FieldValidator<string>;
};
