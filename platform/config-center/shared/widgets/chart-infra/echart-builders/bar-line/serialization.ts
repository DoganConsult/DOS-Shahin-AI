/**
 * Serialization utilities for ECharts options objects.
 *
 * Provides `serializeOptions` and `deserializeOptions` to safely convert
 * EChartsOption objects to/from JSON strings, handling function values
 * and circular references gracefully.
 *
 * Requirements: 18.3, 18.4, 18.5
 */
import type { EChartsOption } from 'echarts';

/** Sentinel placeholder used to represent function values in serialized JSON. */
const FUNCTION_PLACEHOLDER = '__function__';

type BuilderFunction = (...args: unknown[]) => unknown;

/**
 * Serialize an `EChartsOption` to a JSON string.
 *
 * Function values are replaced with the `"__function__"` placeholder.
 * Circular references are handled gracefully — the offending value is
 * replaced with `"__circular__"`.
 *
 * @param options - The ECharts options object to serialize.
 * @returns A valid JSON string representation.
 */
export function serializeOptions(options: EChartsOption): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(options, (_key, value) => {
    if (typeof value === 'function') {
      return FUNCTION_PLACEHOLDER;
    }

    // Guard against circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '__circular__';
      }
      seen.add(value);
    }

    return value;
  });
}

/**
 * Deserialize a JSON string back into an `EChartsOption`.
 *
 * `"__function__"` placeholders are restored to no-op functions by default.
 * If a `builderRegistry` is provided, the placeholder's object key is used
 * to look up a real function from the registry.
 *
 * Parse errors are handled gracefully — an empty object is returned.
 *
 * @param json - The JSON string to parse.
 * @param builderRegistry - Optional map of key → function for restoring placeholders.
 * @returns The restored EChartsOption object.
 */
export function deserializeOptions(
  json: string,
  builderRegistry?: Record<string, BuilderFunction>,
): EChartsOption {
  try {
    const parsed = JSON.parse(json);
    return restoreFunctions(parsed, builderRegistry);
  } catch {
    return {} as EChartsOption;
  }
}

/**
 * Recursively walk an object tree and replace `"__function__"` placeholder
 * strings with callable functions.
 */
function restoreFunctions(
  obj: unknown,
  registry?: Record<string, BuilderFunction>,
): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => restoreFunctions(item, registry));
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (value === FUNCTION_PLACEHOLDER) {
      result[key] = registry?.[key] ?? (() => {});
    } else if (typeof value === 'object' && value !== null) {
      result[key] = restoreFunctions(value, registry);
    } else {
      result[key] = value;
    }
  }

  return result;
}
