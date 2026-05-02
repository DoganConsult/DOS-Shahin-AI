"use strict";
/**
 * @dos/module-sdk validation utilities
 * Common validation functions for module development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validators = void 0;
exports.isUUID = isUUID;
exports.assertUUID = assertUUID;
exports.parseUUID = parseUUID;
exports.isNonEmptyString = isNonEmptyString;
exports.assertNonEmptyString = assertNonEmptyString;
exports.isEmail = isEmail;
exports.assertEmail = assertEmail;
exports.isSlug = isSlug;
exports.assertSlug = assertSlug;
exports.sanitizeString = sanitizeString;
exports.truncateString = truncateString;
exports.isPositiveInteger = isPositiveInteger;
exports.assertPositiveInteger = assertPositiveInteger;
exports.isNonNegativeNumber = isNonNegativeNumber;
exports.clampNumber = clampNumber;
exports.parseIntSafe = parseIntSafe;
exports.parseFloatSafe = parseFloatSafe;
exports.parseBoolean = parseBoolean;
exports.isBoolean = isBoolean;
exports.isValidDate = isValidDate;
exports.assertValidDate = assertValidDate;
exports.isISODateString = isISODateString;
exports.isNonEmptyArray = isNonEmptyArray;
exports.assertNonEmptyArray = assertNonEmptyArray;
exports.ensureArray = ensureArray;
exports.uniqueArray = uniqueArray;
exports.uniqueArrayBy = uniqueArrayBy;
exports.isPlainObject = isPlainObject;
exports.assertPlainObject = assertPlainObject;
exports.hasOwnProperty = hasOwnProperty;
exports.pickKeys = pickKeys;
exports.omitKeys = omitKeys;
exports.isEnumValue = isEnumValue;
exports.assertEnumValue = assertEnumValue;
exports.parseEnumValue = parseEnumValue;
exports.validateRequired = validateRequired;
exports.assertRequiredFields = assertRequiredFields;
exports.parseJSON = parseJSON;
exports.safeStringify = safeStringify;
exports.isModuleCode = isModuleCode;
exports.assertModuleCode = assertModuleCode;
exports.isPermissionCode = isPermissionCode;
exports.assertPermissionCode = assertPermissionCode;
// ────────────────────────────────────────────────────────────────────────────
// UUID Validation
// ────────────────────────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(value) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}
function assertUUID(value, fieldName = 'id') {
    if (!isUUID(value)) {
        throw new Error(`Invalid UUID for ${fieldName}: ${String(value)}`);
    }
}
function parseUUID(value, fieldName = 'id') {
    assertUUID(value, fieldName);
    return value;
}
// ────────────────────────────────────────────────────────────────────────────
// String Validation
// ────────────────────────────────────────────────────────────────────────────
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function assertNonEmptyString(value, fieldName) {
    if (!isNonEmptyString(value)) {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
}
function isEmail(value) {
    if (typeof value !== 'string')
        return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}
function assertEmail(value, fieldName = 'email') {
    if (!isEmail(value)) {
        throw new Error(`Invalid email format for ${fieldName}: ${String(value)}`);
    }
}
function isSlug(value) {
    if (typeof value !== 'string')
        return false;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(value);
}
function assertSlug(value, fieldName = 'slug') {
    if (!isSlug(value)) {
        throw new Error(`Invalid slug format for ${fieldName}: ${String(value)}`);
    }
}
function sanitizeString(value) {
    return value.replace(/[<>]/g, '').trim();
}
function truncateString(value, maxLength, suffix = '...') {
    if (value.length <= maxLength)
        return value;
    return value.slice(0, maxLength - suffix.length) + suffix;
}
// ────────────────────────────────────────────────────────────────────────────
// Number Validation
// ────────────────────────────────────────────────────────────────────────────
function isPositiveInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
function assertPositiveInteger(value, fieldName) {
    if (!isPositiveInteger(value)) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
}
function isNonNegativeNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value) && value >= 0;
}
function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function parseIntSafe(value, defaultValue) {
    if (typeof value === 'number' && Number.isInteger(value))
        return value;
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    return defaultValue;
}
function parseFloatSafe(value, defaultValue) {
    if (typeof value === 'number' && !Number.isNaN(value))
        return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    return defaultValue;
}
// ────────────────────────────────────────────────────────────────────────────
// Boolean Validation
// ────────────────────────────────────────────────────────────────────────────
function parseBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes')
            return true;
        if (lower === 'false' || lower === '0' || lower === 'no')
            return false;
    }
    if (typeof value === 'number')
        return value !== 0;
    return defaultValue;
}
function isBoolean(value) {
    return typeof value === 'boolean';
}
// ────────────────────────────────────────────────────────────────────────────
// Date Validation
// ────────────────────────────────────────────────────────────────────────────
function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime());
}
function parseDateInternal(value) {
    if (value instanceof Date)
        return isValidDate(value) ? value : null;
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isValidDate(date) ? date : null;
    }
    return null;
}
function assertValidDate(value, fieldName = 'date') {
    const date = parseDateInternal(value);
    if (!date) {
        throw new Error(`Invalid date for ${fieldName}: ${String(value)}`);
    }
}
function isISODateString(value) {
    if (typeof value !== 'string')
        return false;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    return isoDateRegex.test(value);
}
// ────────────────────────────────────────────────────────────────────────────
// Array Validation
// ────────────────────────────────────────────────────────────────────────────
function isNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
}
function assertNonEmptyArray(value, fieldName) {
    if (!isNonEmptyArray(value)) {
        throw new Error(`${fieldName} must be a non-empty array`);
    }
}
function ensureArray(value) {
    if (value === undefined || value === null)
        return [];
    return Array.isArray(value) ? value : [value];
}
function uniqueArray(arr) {
    return [...new Set(arr)];
}
function uniqueArrayBy(arr, keyFn) {
    const seen = new Set();
    return arr.filter(item => {
        const key = keyFn(item);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
// ────────────────────────────────────────────────────────────────────────────
// Object Validation
// ────────────────────────────────────────────────────────────────────────────
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function assertPlainObject(value, fieldName) {
    if (!isPlainObject(value)) {
        throw new Error(`${fieldName} must be a plain object`);
    }
}
function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
function pickKeys(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (hasOwnProperty(obj, key)) {
            result[key] = obj[key];
        }
    }
    return result;
}
function omitKeys(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
// ────────────────────────────────────────────────────────────────────────────
// Enum Validation
// ────────────────────────────────────────────────────────────────────────────
function isEnumValue(value, allowedValues) {
    return typeof value === 'string' && allowedValues.includes(value);
}
function assertEnumValue(value, allowedValues, fieldName) {
    if (!isEnumValue(value, allowedValues)) {
        throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}. Got: ${String(value)}`);
    }
}
function parseEnumValue(value, allowedValues, defaultValue) {
    return isEnumValue(value, allowedValues) ? value : defaultValue;
}
function validateRequired(data, requiredFields) {
    const issues = [];
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
function assertRequiredFields(data, requiredFields) {
    const issues = validateRequired(data, requiredFields);
    if (issues.length > 0) {
        const message = issues.map(i => i.message).join('; ');
        throw new Error(`Missing required fields: ${message}`);
    }
}
// ────────────────────────────────────────────────────────────────────────────
// JSON Validation
// ────────────────────────────────────────────────────────────────────────────
function parseJSON(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
function safeStringify(value, space) {
    try {
        return JSON.stringify(value, null, space);
    }
    catch {
        return String(value);
    }
}
// ────────────────────────────────────────────────────────────────────────────
// Permission/Code Validation
// ────────────────────────────────────────────────────────────────────────────
const MODULE_CODE_REGEX = /^[A-Z][A-Z0-9_]{1,30}$/;
const PERMISSION_CODE_REGEX = /^[a-z][a-z0-9_:.]{2,100}$/;
function isModuleCode(value) {
    return typeof value === 'string' && MODULE_CODE_REGEX.test(value);
}
function assertModuleCode(value, fieldName = 'moduleCode') {
    if (!isModuleCode(value)) {
        throw new Error(`Invalid module code for ${fieldName}: ${String(value)}. Must be uppercase alphanumeric with underscores, 2-31 characters`);
    }
}
function isPermissionCode(value) {
    return typeof value === 'string' && PERMISSION_CODE_REGEX.test(value);
}
function assertPermissionCode(value, fieldName = 'permissionCode') {
    if (!isPermissionCode(value)) {
        throw new Error(`Invalid permission code for ${fieldName}: ${String(value)}. Must be lowercase with dots/colons, 3-101 characters`);
    }
}
exports.Validators = {
    uuid: {
        validate: isUUID,
        parse: (v) => isUUID(v) ? v : null,
        assert: assertUUID,
    },
    email: {
        validate: isEmail,
        parse: (v) => isEmail(v) ? v : null,
        assert: assertEmail,
    },
    nonEmptyString: {
        validate: isNonEmptyString,
        parse: (v) => isNonEmptyString(v) ? v : null,
        assert: assertNonEmptyString,
    },
    positiveInteger: {
        validate: isPositiveInteger,
        parse: (v) => isPositiveInteger(v) ? v : null,
        assert: assertPositiveInteger,
    },
    moduleCode: {
        validate: isModuleCode,
        parse: (v) => isModuleCode(v) ? v : null,
        assert: assertModuleCode,
    },
    permissionCode: {
        validate: isPermissionCode,
        parse: (v) => isPermissionCode(v) ? v : null,
        assert: assertPermissionCode,
    },
};
//# sourceMappingURL=validation.js.map