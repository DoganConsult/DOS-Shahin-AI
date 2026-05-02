// ============================================
// Shahin — Workflow Serialization Service
// JSON + YAML import/export for workflow definitions
// ============================================

import * as yaml from "js-yaml";
import { safeQuery } from "@dos/db";

/**
 * Serialize workflow data to YAML format.
 */
export function toYaml(data: unknown): string {
  return yaml.dump(data, { schema: yaml.JSON_SCHEMA, indent: 2, lineWidth: 120 });
}

/**
 * Parse YAML string to object.
 */
export function fromYaml(yamlStr: string): unknown {
  return yaml.load(yamlStr, { schema: yaml.JSON_SCHEMA });
}

/**
 * Detect whether a string is JSON or YAML.
 */
export function detectFormat(content: string): "json" | "yaml" {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "yaml";
    }
  }
  return "yaml";
}

/**
 * Parse content that may be JSON or YAML, returning a JS object.
 */
export function parseAnyFormat(content: string): unknown {
  const fmt = detectFormat(content);
  if (fmt === "json") {
    return JSON.parse(content);
  }
  return fromYaml(content);
}
